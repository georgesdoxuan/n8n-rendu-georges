# SPECS : Workflow "Idée boutique → mockup duo → Telegram"

Date de création : 2026-09-29 · Dernière mise à jour : 2026-09-29 (soir)

---

## 1. Objectif / résultats attendus

**Scénario idéal quand c'est terminé :**

Chaque matin à 8h00, le workflow s'exécute tout seul. Georges (et, une fois branché,
son pote) reçoit sur Telegram en moins de 5 minutes :

```
🛍️ Idée boutique : <nom + pitch>
🎯 Niche : <thématique> · Marché : <FR|US>
⭐ Produit vedette : <produit> : <prix> EUR

[Photo] Image carrée 1:1 : screen mobile de la page d'accueil (gauche, hero à
85-90% de l'écran) + screen de la page produit (droite)
```

Chaque idée est enregistrée dans la data table n8n `brume_idees`, exportable en CSV.
Le bot utilisé est @iss_alert67_bot ("Idées Boutiques E-Com").

## 2. Contraintes

| Contrainte | Valeur |
|---|---|
| Coût par run | **< 0,10 €** (compte Google AI Studio crédité ~5 €) |
| Coût image | Nano Banana 2 Flash, < 0,10 €/jour pour 1 run/jour (~5 € de crédit sur le compte) |
| DeepSeek | ~0,0001 €/run (modèle `deepseek-flash`, le moins cher) |
| Durée par run | < 5 min |
| Fréquence | 1 fois/jour à 8h00 (workflow **actif**) |
| Zéro nouvelle infra | n8n existant + VPS existant |
| Format image | carré 1:1, deux screens mobile côte à côte, imageSize 1K (minimum) |

## 3. Pipeline (workflow n8n `XjOlFNKF3ldjsVBO`)

```
[1. Schedule 8h00 + manuel] → [2. Lecture historique brume_idees]
 → [3. Exclusions] → [4. DeepSeek flash] → [5. Parse JSON]
 → [6a. Gemini duo 1:1] → [7. Assemble] → [8. Telegram : fiche + photo]
 → [6b. Log data table brume_idees] (branche parallèle, même si 6a échoue)
```

1. **DeepSeek** (`deepseek-chat` → sert `deepseek-flash`, JSON forcé) : reçoit la
 liste des idées déjà proposées (exclusions) et propose 1 niche réellement
 nouvelle + rédige `prompt_image`, le prompt complet de génération.
2. **Prompt DeepSeek** (le cœur du système, versions backupées dans `prompts/`) :
 - structure type VERTICE (sections 1 à 5) embarquée comme modèle,
 - **branding créatif** : logo sur mesure + pictogramme, slogan en jeu de mots,
 noms de produits travaillés,
 - **variété** : 1 archetype de layout parmi A-F, annoncé dans un bloc LAYOUT
 DIRECTION (interdiction de réutiliser la même disposition à chaque run),
 - **adaptation niche** : palette sémantique, photographie, iconographie,
 textures cohérentes avec l'univers (terreux / néons sombres / papier
 artisanal / pastels…),
 - **design signature** : 2-3 effets "wow" type Dribbble (duotone étalonné,
 titres outline, marquee, numéros géants, stickers inclinés, gradient mesh,
 grain…),
 - **exactitude textuelle** : chaînes exactes entre guillemets, copies courtes
 (titre 2-6 mots), français parfait avec accents, consigne CRITICAL TEXT
 ACCURACY,
 - **ban du blanc jauni** (crème/ivoire type #F8F6F0) ; blanc pur encouragé.
3. **Nano Banana 2 Flash** `gemini-3.1-flash-image` : `generateContent` avec
 `imageConfig {aspectRatio: "1:1", imageSize: "1K"}`, clé AI Studio gratuite.
4. **Telegram** : fiche texte + photo via un bot dédié (le chat_id du destinataire est lu dans la data table `brume_config` ; tout nouveau destinataire doit d'abord écrire au bot, règle Telegram).
 Les photos sont branchées en parallèle depuis l'assembleur (un nœud Telegram
 ne propage pas le binaire à sa sortie).
5. **Log** : insertion dans la data table `brume_idees` (id `zWTaXqDkOrkLg6XA`),
 colonnes : run_at, nom, pitch, niche, marche_cible, produit_vedette,
 prix_cible, ton_marque, statut.

## 4. Alignement hostile : les incohérences et limites trouvées

1. **Les fautes de texte dans les images ne seront jamais à zéro.** Gemini
 génère les pixels du texte ; les consignes (chaînes exactes, copies courtes,
 relecture) réduisent le risque mais ne l'éliminent pas (vu en test :
 "La Balanèle", "règlage"). C'est une limite du modèle, pas du workflow.
2. **Le workflow s'auto-évalue.** DeepSeek choisit la niche ET valide qu'elle
 "pourrait marcher" : biais de confirmation garanti. Mitigation partielle :
 critères objectifs dans le prompt (marge ≥ 15 € post-droits, produit générique
 sourçable en masse sur AliExpress via DSers). Aucune donnée de marché réelle
 (SEMrush) n'alimente le choix.
3. **Anti-doublons implémenté (v8, 29/09 soir).** Avant chaque appel DeepSeek, le
 workflow lit les ~40 dernières lignes de `brume_idees` et les injecte dans le
 prompt comme exclusions explicites (noms + niches, thématiques voisines
 interdites). Vérifié en run réel : l'idée générée (apiculture) est disjointe
 de tout l'historique. Limite résiduelle : DeepSeek peut rapprocher une niche
 exclue sans la recopier ; la détection reste à l'œil dans la table.
4. **Quota Gemini non maîtrisable depuis le workflow.** Un 429 arrête la branche
 image (le log de l'idée survit grâce à la branche parallèle). Le quota peut
 être épuisé par d'autres usages de la même clé ; surveillance manuelle sur
 https://ai.dev/rate-limit.
5. **Clés API : résolu le 29/09 soir.** Les clés DeepSeek et Gemini vivent
 désormais dans des credentials n8n Header Auth ("Deepseek API",
 "Gemini API"), les appels passent par des nœuds HTTP Request avec
 `authentication: genericCredentialType` : vérifié : aucune clé dans
 l'export du workflow. Le nœud Code n8n ne pouvant pas lire les
 credentials (sandbox), la construction des corps JSON se fait dans des
 nœuds Code amont et le HTTP Request référence `={{ $json.dsBody }}` /
 `={{ $json.geminiBody }}`. Reste en clair : rien.
6. **Compte OpenAI abandonné** (1,36 € restants, ~130 images possibles) : gardé
 comme secours si quota Gemini indisponible, mais non câblé.
7. **Google Sheets demandé au départ, table n8n livrée.** Aucune authentification
 Google exploitable sur la machine (sandbox Code n8n sans `require('crypto')`
 → JWT de service account impossible). La data table n8n est le substitut ; un
 Google Form lié à une Sheet reste possible (~5 min manuelles) si besoin.
8. **Destinataire supplémentaire (pote) en attente** : un bot Telegram ne peut
 pas démarrer une conversation ; le pote doit d'abord écrire à
 @iss_alert67_bot. Workflow de capture déployé (temporaire, actif).

## 5. Hors périmètre

* Aucun déploiement sur la boutique Brume (catalogue vide, HANDOFF §7).
* Aucune vraie page web : visuel de simulation uniquement.
* Pas d'analyse de concurrence ni de données marché réelles.
* Pas de commande "encore" par reply Telegram (nice-to-have, non implémenté).

## 6. Tooling & repo

Le projet est géré avec [`n8ncli`](https://www.npmjs.com/package/@workflows-accelerator/n8n-cli) : workflows versionnés en TypeScript dans `n8n/workflows/`, validation locale, sync pull/push. Le token d'accès à l'instance vit dans `~/.n8ncli-global.json`, **hors du repo**. Le skill agent importé par `n8ncli import-skill` est dans `.agents/skills/n8n/SKILL.md`.

## 7. Implémentation : historique du 29/09/2026

| Version | Changement | Workflow ID |
|---|---|---|
| v1 | Pipeline OpenAI, 2 images 1024×1024 | `HDyz57xWnrf1DTeU` (archivé) |
| v2 | Gemini à la place d'OpenAI, 1 image 9:16, table `brume_idees` | `rLacV57EIDkTNNi6` (archivé) |
| v3 | Prompt structuré VERTICE rédigé par DeepSeek | `HNYAHlLrl47ykxvF` (archivé) |
| v4 | Branding créatif (logo + slogan) | `5Biel6THpG3IpFJq` (archivé) |
| v5 | Archetypes de layout A-F, UI adaptée à la niche | `KcgPFdOPKPqRfvvG` (archivé) |
| v6 | Duo carré 1:1 (accueil hero 85-90% + produit), ban blanc jauni | `NlS0PKEuKJVfcoUp` (archivé) |
| v7 | Exactitude textuelle + design signature wow | `JFtuM1VWdAy8CbNW` (archivé) |
| v8 | Anti-doublons : historique de la table injecté comme exclusions dans le prompt DeepSeek | `iOt0TvDh4GZ77TGB` (archivé) |
| v9 | Critère produit dropshippable DSers/AliExpress (générique, pas de marque, expédiable depuis l'Asie) | `wtFrmaw0L3X4JwjN` (archivé) |
| v11 | Clés DeepSeek/Gemini sorties du code vers des credentials n8n Header Auth ; appels via nœuds HTTP Request (aucune clé en clair, vérifié sur l'export) | `5J1IUxL2IQQ197rO` (archivé) |
| **v12 (courant)** | Modèle image : Nano Banana 2 Flash (`gemini-3.1-flash-image`), compte avec ~5 € de crédit (< 0,10 €/jour) ; repo n8ncli initialisé, workflows versionnés en code | **`XjOlFNKF3ldjsVBO` (actif, cron 8h00)** |

Backups des prompts DeepSeek par version dans `~/Documents/GDX/Brume/prompts/`.

Accès technique : modifications faites via le **serveur MCP intégré à n8n**
(endpoint et Bearer token configurés dans `~/.n8ncli-global.json`, jamais dans le
repo), outils `create_workflow_from_code` (code TypeScript du Workflow SDK n8n),
`update_workflow`, `publish_workflow`, `execute_workflow`, et outils data tables.
Ni SSH, ni API REST (pas de clé API n8n configurée) : le MCP est la porte d'entrée.
