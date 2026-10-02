# Projet 2 : Chatbot RAG E-Com (n8n + Supabase)

Chatbot RAG : on dépose un PDF via un formulaire n8n, il est découpé et vectorisé
dans Supabase (pgvector), puis on discute avec un chatbot qui répond UNIQUEMENT
depuis les documents, avec citations et mémoire de conversation persistante.

## Contenu de ce dossier

- `exports/RAG E-Com Ingestion.json` : formulaire d'upload + modes Add / Remove /
  Replace (gestion de plusieurs documents).
- `exports/RAG E-Com Answering.json` : chatbot complet (mémoire persistante,
  routage de la question, recherche hybride vectorielle + mots-clés, reranking,
  réponse citée).
- `setup.sql` : le SQL à exécuter une fois dans Supabase.
- `README.md` (ce fichier) + ce dossier est la copie autonome à remettre au prof.

## Sources TypeScript (workflow as code)

Les sources `.ts` synchronisées avec l'instance vivent dans
`../n8n/workflows/RAG E-Com/` (dossier imposé par l'outil n8ncli) :
- `RAG E-Com Ingestion.workflow.ts`
- `RAG E-Com Answering.workflow.ts`
- `README.md` interne (état vérifié, pièges d'infra, historique).

## Installation (15 min)

1. **Import** : dans n8n, "Import from file" pour chaque JSON de `exports/`.
2. **Supabase** : créer un projet gratuit sur supabase.com, ouvrir le SQL Editor
   et exécuter tout `setup.sql`.
3. **Credentials** (n8n → Credentials, garder les mêmes noms) :
   - `Supabase account` (type Supabase) : URL du projet + clé service_role.
   - `OpenAI account` (type OpenAI) : une clé Gemini, avec Base URL
     `https://generativelanguage.googleapis.com/v1beta/openai/`
     (l'API Gemini est compatible OpenAI : chat + embeddings avec une seule clé).
   - `Postgres account` (type Postgres) : host `db.<ref>.supabase.co`, port 5432,
     database `postgres`, user `postgres`, mot de passe DB du projet (Dashboard
     Supabase > Database > Reset database password si perdu), SSL activé.
4. **Activer** les deux workflows (toggle Publish).

## Utilisation

- **Ingestion** : ouvrir le workflow "RAG E-Com Ingestion" > noeud "Upload
  Document" > "Open form" (ou l'URL publique du formulaire). Choisir le mode,
  déposer un PDF, "Apply". Add ajoute, Remove retire un document par son nom,
  Replace vide tout et reingere.
- **Chat** : workflow "RAG E-Com Answering" > noeud "RAG Chat Trigger" >
  "Open chat". Poser une question puis une question de suivi : le bot cite ses
  sources `[1]` et se souvient de la conversation (meme apres fermeture).

## Comment ca marche (resume)

- **Ingestion** : PDF > extraction texte > decoupage en chunks tagues
  (fichier + page) > embeddings Gemini (512 dims) > table `documents` (pgvector).
- **Answering** : historique persistant > routage de la question (standalone +
  mots-cles) > recherche hybride (vecteur + full-text `fts`) > reranking LLM >
  reponse generee uniquement depuis les passages, avec citations, puis echange
  sauvegarde dans `n8n_chat_histories`.

Source : adaptation du template n8n.io #5993 (Documentation Expert Bot RAG).
