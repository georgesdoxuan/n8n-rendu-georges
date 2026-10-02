# Projet Chatbot RAG E-Com

Chatbot RAG (Retrieval-Augmented Generation) qui répond aux questions de e-commerce
uniquement à partir d'un livre de référence : *Online Retail Marketing Strategy:
Foundations and Consumer Experience* (PDF local, voir plus bas).

## Architecture

```
PDF (formulaire "Upload Document")
   |
   v
RAG E-Com Ingestion  (modes Add/Remove/Replace, chunks tagues source+page,
                      embeddings Gemini 512, Supabase pgvector)
   |
   v
Supabase : documents (pgvector + colonne fts full-text + source + page)
           n8n_chat_histories (memoire persistante, auto-creee)
   |
   v
RAG E-Com Answering  (architecture complete, style "friend" :
  Chat -> Load History (memoire persistante Postgres)
      -> Route Question (question standalone + mots-cles + needsSearch)
      -> recherche hybride : Vector Search (PGVector) + Keyword Search (SQL fts)
      -> fusion + dedup + Rerank LLM -> Pick Best Passages
      -> Generate Answer (citations [n] + liste de sources)
      -> Save to Memory -> Return Answer)
```

Le vector store standard pgvector suffit : pas besoin du "S3 Vectors Wrapper"
du dashboard Supabase.

## Architecture


```
PDF local (RAG - E-Com/PDF.pdf)
   |  POST multipart manuel (curl)
   v
RAG E-Com Ingestion  (webhook -> extraction texte -> chunks -> embeddings)
   |  insert pgvector (table documents, vector(512))
   v
Supabase : projet "Chatbot RAG E-Com" (ref zmqdtkveirtspaotjvje)
   |  similarite vectorielle (fonction match_documents)
   v
RAG E-Com Answering  (chat -> question -> retrieval -> assemblage contexte
                      -> agent Gemini -> reponse groundee, memoire conversation)
```

Choix d'architecture et pourquoi :

- **Vector store Supabase standard** (pgvector, table `documents`, RPC
  `match_documents`) : pas le "S3 Vectors Wrapper" du dashboard, qui n'est pas
  nécessaire. Même choix que le template de référence
  (`Template/Documentation Expert Bot RAG Gemini Supabase`).
- **Retrieval explicite (mode `load` du nœud vector store) et NON
  retrieve-as-tool** : le retrieve-as-tool du template a été essayé et fonctionne
  pour la génération de l'appel d'outil, mais l'endpoint compatible OpenAI de
  Gemini rejette en 400 la requête suivante qui contient le message de résultat
  d'outil. Contournement validé par run réel : retrieval getMany avant l'agent,
  contexte injecté dans le prompt de l'agent (promptType define). L'agent garde
  le modèle chat et la mémoire conversation.
- **Chat = `gemini-flash-latest`** via l'endpoint compatible OpenAI : c'est le
  SEUL identifiant de modèle accepté par cet endpoint (testé en run réel :
  `gemini-2.5-flash`, `gemini-3-flash-preview`, `gemini-3.1-*` renvoient 404 ou
  400). Les embeddings = `gemini-embedding-001`, 512 dimensions.
- **Pas de nœud embeddings Google natif** : il n'existe pas sur cette instance
  d'n8n. Les embeddings passent par `embeddingsOpenAi` avec le baseURL Gemini
  porté par le credential (le nœud ignore options.baseURL, vérifié par
  interception de requête).
- Keep-alive Supabase et cron d'ingestion : volontairement NON activés (pas de
  cron sans accord explicite de Georges).

## Fichiers

- `RAG E-Com Ingestion.workflow.ts` : pipeline d'ingestion (formulaire public "Upload Document").
- `RAG E-Com Answering.workflow.ts` : chatbot (chat trigger public + agent).

Workflow IDs (à préserver absolument, ce sont les URLs publiques) :
Ingestion `zdxG1DepWxrK8a8V`, Answering `4raFt3nzDSaCpkZS`, dossier `fqQCE10FxhysKJ38`.

## Accès à l'infra n8n

- Instance : `https://vmi3607888.contaboserver.net` (auto-hébergée, Contabo).
- CLI : `n8ncli` depuis `~/Documents/GDX/Brume/n8n`, env PROD en mode MCP-only
  (pas de clé REST, pas de dbUrl). Voir "Pièges" plus bas : push et pull sont
  peu fiables pour le contenu dans ce mode.
- MCP intégré à n8n : endpoint et Bearer token dans `~/.n8ncli-global.json`.
  Outils utiles : `search_workflows`, `get_workflow_details`,
  `get_workflow_execution` (avec `includeData`), `search_workflow_executions`,
  `list_credentials`, `execute_workflow`, `update_workflow` (opérations
  atomiques), `publish_workflow` / `unpublish_workflow`, `move_workflows_to_folder`,
  `search_data_tables`, `rename_data_table`.
- MCP Supabase : configuré dans `~/.kimi-code/mcp.json` (serveur "supabase",
  projet `zmqdtkveirtspaotjvje`, auth par PAT en header Authorization). Le
  serveur exige une poignée de main `initialize` (header `mcp-session-id`) et
  bloque le User-Agent python par défaut (mettre un UA type curl). Helper local
  de session : `/tmp/supabase_mcp.py` (à recréer si absent, il n'est pas
  versionné).

## Credentials n8n (noms exacts)

- `OpenAI account` (type openAiApi, id `sTwxOspbTIrKUsoj`) : clé API Gemini,
  avec **Base URL du credential** = `https://generativelanguage.googleapis.com/v1beta/openai/`.
  Sert au chat (lmChatOpenAi) et aux embeddings (embeddingsOpenAi).
- `Supabase account` (type supabaseApi, id `bEmTjDSWtMLEUUQq`) : URL du projet +
  clé service_role (le service_role contourne le RLS, donc l'RLS activée sur
  `documents` ne gêne pas les workflows).
- `Postgres account` (type postgres, id `53nEuQ2JNY7Fm05r`) : POINTE VERS
  SUPABASE (host direct `db.zmqdtkveirtspaotjvje.supabase.co`, user `postgres`,
  mot de passe DB du projet). Utilise par la memoire persistante, la recherche
  hybride et le vector store PGVector. Pieges resolus : host direct IPv6-only
  (le serveur le gere), pooler inaccessible depuis certains reseaux, mot de
  passe DB resettable dans Dashboard -> Database.

## Côté Supabase

Créé et vérifié le 2026-10-01 via MCP : extension `vector` 0.8.2 activée, table
`public.documents` (RLS activé, 0 politique = anon/authentifié bloqués,
service_role passe), fonction `match_documents(vector(512))`.

```sql
create extension if not exists vector;

create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(512),
  source text,
  page integer
);

create or replace function match_documents (
  query_embedding vector(512),
  match_count int default null,
  filter jsonb default '{}'
) returns table (id bigint, content text, metadata jsonb, similarity float)
language plpgsql as $$
#variable_conflict use_column
begin
  return query
  select id, content, metadata, 1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where filter = '{}'::jsonb or metadata is null or metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

Ré-indexer proprement : `truncate table documents restart identity;` puis
ré-ingérer (penser que "Skip Already Ingested" a une mémoire inter-exécutions :
un contenu identique sera sauté même après truncate ; contourner en changeant un
caractère ou en réinitialisant l'historique du nœud).

## Source PDF et ingestion

- Source : `~/Documents/GDX/Brume/n8n/RAG - E-Com/PDF.pdf`
  (sha256 : `d694ce9cdc2306bf54c0512e6323fbc1d8609045d5b69c556496e918c81f68f0`,
  231 pages).
- **Gestion multi-documents** (le point clé : tout se fait depuis le formulaire
  ou le webhook, sans SQL ni tiers) :
  - **Add document** (défaut) : ajoute le PDF à la base existante. Plusieurs
    documents cohabitent, le chat répond depuis tous.
  - **Remove document** : supprime un document précis (champ "Document Name" =
    nom exact du fichier, ex. `cdc_25517_DS1.pdf`). Chaque chunk est tagué avec
    sa source, donc la suppression est ciblée.
  - **Replace all documents** : vide toute la table puis ingère le nouveau PDF
    (base = un seul document).
  - Les chunks sont tagués `source` (nom du fichier) et `page` dans des colonnes
    dédiées de `documents` (migration appliquée le 2026-10-02).
- Rien n'alimente le PDF automatiquement : UNE seule entrée, le formulaire
  public "Upload Document" (Form Trigger) :
  - Production : `https://vmi3607888.contaboserver.net/form/74436a0d-b7b7-4622-85d2-486bd90a8073`
  - Test dans l'UI : bouton "Open form" du nœud.
  - Champs : Mode (Add / Remove / Replace), Document (fichier PDF),
    Document Name (pour Remove).
  - IMPORTANT : dans le HTML du formulaire, les champs s'appellent
    `field-0`, `field-1`, `field-2` (dans l'ordre de définition), PAS les
    libellés. Soumission vérifiée en run réel (upload ET remove ciblé).

- Chat public : `https://vmi3607888.contaboserver.net/webhook/7d2f82e6-3f07-4052-94fb-c1cdc93f9c0f/chat`
  (POST JSON `{"chatInput": "...", "sessionId": "..."}`).

## Dette de synchronisation connue (2026-10-02)

Le workflow Answering distant a ete reconstruit en architecture complete
(style "friend") via MCP. Le fichier local `RAG E-Com Answering.workflow.ts`
reflete encore l'ancienne version : le REGENERER depuis le distant ou le
reecrire depuis les exports dans `backups/`. L'ingestion est synchrone.

## État vérifié (méthode doubt-driven)

Vérifié par runs réels le 2026-10-01 :

- Ingestion : exécution webhook réelle du PDF local, succès, **411 chunks**
  relus en SQL dans `public.documents` (extraction 231 pages OK, embeddings
  Gemini 512 dims OK, insert pgvector OK).
- Answering : question EN réelle -> réponse groundée tirée du livre (facteurs
  de succès CX) ; question de suivi -> la mémoire conversation fonctionne ;
  question FR -> réponse FR groundée. 3 runs réels au vert.
- Workflows actifs (publish fait), dans le dossier "RAG E-Com", IDs préservés.
- Ancienne dette nettoyée : 3 data tables dupliquées renommées
  "OBSOLETE rag_ecom_documents v1..v3" (la v4 intacte ; suppression via MCP
  impossible, à faire en UI n8n si voulu). Workflows temporaires de debug
  archivés.

## Pièges connus sur cette infra (tous vérifiés en run le 2026-10-01)

- **`n8ncli push` ne modifie PAS le contenu des nœuds en mode MCP-only** : il
  affiche `[UPDATED]`, touche la métadonnée (updatedAt change) mais le contenu
  distant reste ancien. Toujours revérifier via `get_workflow_details` après un
  push. Pour modifier le contenu : MCP `update_workflow` avec des opérations
  (addNode, updateNodeParameters replace, addConnection...), puis
  **unpublish/publish obligatoire** (l'active version d'un workflow actif reste
  en cache sinon : le webhook exécute l'ancien code même quand le draft est à
  jour).
- **`n8ncli pull` peut rester sur un cache stale** (`config/cache/workflows/`)
  et son sync-state : vider les entrées des deux workflows dans
  `config/sync-state.json` + supprimer les fichiers cache, ou corriger le
  contentHash (= sha256 du fichier) à la main après édition locale.
- **Types de connexions des subnodes** : `ai_embedding`, `ai_languageModel`,
  `ai_memory`, `ai_tool`, `ai_textSplitter` et **`ai_document`** (pas
  "ai_documentLoader") pour brancher un Default Data Loader sur un vector store.
- **Expressions n8n** : un paramètre contenant `{{ ... }}` doit commencer par
  `=` ; un `\n` littéral dans une expression JS = "invalid syntax" (utiliser
  `String.fromCharCode(10)` ou un join). `setNodeParameter` prend un path
  relatif aux parameters (`/text`, pas `/parameters/text`).
- **MCP `update_workflow` ne gère pas `notesInFlow`** (notes OK) : compléter le
  lint localement après coup.
- Les nœuds Code tournent en sandbox sans `require` (pas de modules npm).
- **Le nœud Supabase (delete) RENVOIE les lignes supprimées** : branché en ligne
  il écrase le flux. Pour "vider puis continuer" : alwaysOutputData=true sur le
  delete + Merge chooseBranch waitForAll qui garde l'entrée d'origine (pattern
  "Keep Trigger Input / After Clear" de l'ingestion).
- **Extract From File, les nœuds HTTP et les nœuds Supabase écrasent les champs
  json entrants** (pas de includeInputData fiable) : les données nécessaires en
  aval doivent être re-injectées (via un Code qui relit les triggers) ou
  re-croisées via `$('Noeud Amont').item.json`.
- **PostgREST encode les strings en jsonb string** (double encodage) : une
  colonne jsonb reçue via le nœud Supabase contient une CHAINE, pas un objet.
  D'où : colonnes dédiées (source/page) plutôt que jsonb, et clause
  `filter = '{}' or metadata is null or ...` dans match_documents.
- **`removeConnection` exige sourceIndex** quand la source a plusieurs sorties
  (ex. la branche false d'un IF est l'index 1).
- Le nœud HTTP Request v4.5 ignore `options.includeInputData` (vérifié) : sa
  sortie ne contient que la réponse API.
- **Historique du nœud removeDuplicates ("previous executions")** : stocké dans
  le static data du workflow, il fait SILENCIEUSEMENT planter la suite du flux
  quand il devient trop gros (valeurs de dédup longues × historySize élevé).
  Garder des valeurs courtes (ici : source + page + 60 premiers caractères) et
  historySize 1000. Symptôme observé : exécution "success" qui s'arrête net
  après le nœud, stack vide, 0 insertion.
- **Formulaires (Form Trigger)** : dans cette version d'n8n (2.40), les pages
  de formulaire sont servies sur `/form/<webhookId>` en production et
  `/form-test/<webhookId>` en test (NI `/webhook/<id>/form`, NI `/forms/<id>` —
  ces routes renvoient des 404 trompeurs, `/forms/*` sert même le fallback SPA
  en GET, d'où de fausses pistes). Un nœud Form Trigger créé via MCP doit être
  ré-enregistré par un passage dans l'UI (autosave) pour que ses paramètres
  soient normalisés par le frontend ; après ça, publish MCP suffit et la route
  `/form/<id>` fonctionne (vérifié en run réel).
- Le MCP n8n n'a pas d'outil de suppression de data table ni de modification de
  credential. Les credentials httpHeaderAuth ne se résolvent pas dans les
  workflows temporaires créés par `create_workflow_from_code` ("Credentials not
  found") ; les credentials par id (postgres, supabaseApi, openAiApi) passent.
- Après `create_workflow_from_code` : un nouvel ID est créé, archiver soi-même
  le workflow temporaire après usage.
- Le template en dossier `Template/` est une référence d'étude : ses credentials
  sont retirés, ne pas l'activer.
- Ne rien committer dans le repo GitHub public `georgesdoxuan/n8n-rendu-georges`
  (rendu de cours) : tout reste local.

## Reste à faire (propositions, rien de bloquant)

- Supprimer les 3 data tables "OBSOLETE" via UI n8n (impossible via MCP).
- Supprimer la data table v4 et les credentials `Gemini API` / `Deepseek API`
  quand l'ancienne architecture n'est plus nécessaire en repli.
- Option keep-alive Supabase (cron 6 jours) si le délai de réveil du projet free
  devient gênant : demander l'accord à Georges d'abord.
- Le PAT Supabase dans `~/.kimi-code/mcp.json` expire le 30/12/2026 ; régénérer
  à cette date.
