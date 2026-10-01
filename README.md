# Idées de boutiques e-commerce : workflow n8n génératif

Projet de cours n8n. Chaque matin à 8h00, le workflow propose une idée de boutique
ecommerce jamais répétée, génère deux écrans mobiles (page d'accueil et page
produit) par IA, et envoie le résultat sur Telegram. Chaque idée est archivée dans
une data table n8n.

## Ce que le projet démontre

1. **Workflow as code** : le workflow vit en TypeScript dans `n8n/workflows/`
 (format `@n8n/workflow-sdk`) et se synchronise avec l'instance via
 [n8ncli](https://www.npmjs.com/package/@workflows-accelerator/n8n-cli)
 (`pull`, `validate`, `push`, `publish`, `exec`). Aucune modification à la main
 dans le canvas.
2. **Prompt engineering itératif** : le coeur du système est le prompt system de
 DeepSeek (`prompts/`, 4 versions conservées) : structure imposée, branding
 créatif, archetypes de layout A à F pour imposer la variété, adaptation de
 l'UI à la niche, exactitude textuelle (chaines exactes, accents), contraintes
 négatives (blanc jauni interdit), critère produit dropshippable (AliExpress).
3. **Gestion des credentials** : aucune clé API dans le code. Credentials
 "Header Auth" n8n, référencés par les nœuds HTTP Request. Le nœud Code n8n ne
 pouvant pas lire les credentials, des nœuds "préparer appel" en amont
 construisent les corps JSON.
4. **Anti doublons par data table** : l'historique des idées est lu puis injecté
 dans le prompt comme exclusions, avant chaque génération.
5. **Log structuré** : chaque run insère une ligne dans la data table
 `brume_idees`, même si la génération d'image échoue (branche parallèle).

## Architecture

```
Schedule 8h00 / déclenchement manuel
 → Historique (data table) → Exclusions (Code)
 → DeepSeek flash (HTTP Request, credential)
 → Parse JSON
 → Gemini image, Nano Banana 2 Flash (HTTP Request, credential, ratio 1:1)
 → Extraction image (Code) → Assemblage (Code)
 → Telegram : fiche texte + photo duo
 → Log data table (branche parallèle)
```

Coût par run : moins de 0,10 € (DeepSeek flash environ 0,0001 € + 1 image
Nano Banana 2 Flash).

## Structure du repo

| Chemin | Rôle |
|---|---|
| `n8n/workflows/` | Le workflow versionné en code (format `@n8n/workflow-sdk`) |
| `n8n/config/` | Configuration n8ncli (sync, standards, layout) |
| `docs/SPECS.md` | Specs complètes : objectif, contraintes, alignement hostile, historique |
| `docs/revue-hostile.md` | Revue hostile exécutée sur le workflow (méthode et rapport) |
| `prompts/` | Les 4 versions du prompt DeepSeek (évolution du prompt engineering) |
| `specs/` | Spec validée du workflow (méthode spec-driven) |
| `.agents/skills/` | Skill n8n (importé par `n8ncli import-skill`) + 3 skills de méthode |

## Les 3 skills de méthode

Skills d'agent dans `.agents/skills/`, utilisés pour piloter les évolutions du
workflow :

* `doubt-driven-dev` : aucun résultat n'est vrai sans preuve observée sur
 l'infra réelle (run réel, table relue, image mesurée). Boucle de critique,
 compte rendu en trois catégories : Vérifié, Non vérifié, Problèmes trouvés.
* `revue-hostile` : attaque du workflow et du repo. Scénarios concrets par
 frontière (secrets, entrées non fiables, accès, dépendances, défaillances à
 moitié), angle coût et quota chiffré, rapport classé Confirmé ou Plausible.
* `spec-driven` : toute nouvelle fonctionnalité passe d'abord par une spec
 validée (`specs/<nom>.md`) avec des affirmations vérifiables sur l'infra.

## Reproduire le projet

```bash
npm install -g @workflows-accelerator/n8n-cli
# dans le repo :
n8ncli init --url <instance n8n> --access-token <token MCP> --project-id <id> --env PROD
n8ncli pull
```

Prérequis côté n8n (créés à la main dans l'UI, l'API ne le permet pas) :
deux credentials "Header Auth" (DeepSeek, Gemini) et un credential Telegram API.
