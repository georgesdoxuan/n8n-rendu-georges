# Projet 1 : Workflow génératif "Idée boutique e-commerce → mockup duo → Telegram"

Chaque matin à 8h00, le workflow propose une idée de boutique e-commerce jamais
répétée, génère deux écrans mobiles (page d'accueil et page produit) par IA, et
envoie le résultat sur Telegram. Chaque idée est archivée dans une data table n8n.

## Ce que le projet démontre

1. **Workflow as code** : le workflow vit en TypeScript dans
   `n8n/workflows/Brume _ Idée boutique → mockup duo → Telegram.workflow.ts`
   (format `@n8n/workflow-sdk`) et se synchronise avec l'instance via
   [n8ncli](https://www.npmjs.com/package/@workflows-accelerator/n8n-cli)
   (`pull`, `validate`, `push`, `publish`, `exec`). Aucune modification à la main
   dans le canvas.
2. **Prompt engineering itératif** : le coeur du système est le prompt system de
   DeepSeek (`prompts/`, 4 versions conservées) : structure imposée, branding
   créatif, archetypes de layout A à F pour imposer la variété, adaptation de
   l'UI à la niche, exactitude textuelle, contraintes négatives, critère produit
   dropshippable (AliExpress).
3. **Gestion des credentials** : aucune clé API dans le code. Credentials
   "Header Auth" n8n, référencés par les nœuds HTTP Request.
4. **Anti doublons par data table** : l'historique des idées est lu puis injecté
   dans le prompt comme exclusions, avant chaque génération.
5. **Log structuré** : chaque run insère une ligne dans la data table
   `brume_idees`, même si la génération d'image échoue (branche parallèle).

## Contenu de ce dossier

- `prompts/` : les 4 versions du prompt system image (de la v1 verticale à la
  v4 duo carré).
- `docs/` : la spec technique (`SPECS.md`) et la revue hostile (analyse des
  risques du workflow).
- `specs/` : la spec métier validée (`idee-boutique.md`) et le mode d'emploi du
  dossier.
- Le workflow lui-même : `../n8n/workflows/Brume _ Idée boutique → mockup duo →
  Telegram.workflow.ts` (dossier `n8n/workflows/` imposé par l'outil de sync
  n8ncli).

## Architecture

```
Schedule 8h00
  → prompt système DeepSeek (génération idée boutique, historique en exclusion)
  → prompt image Vertice (mockup duo carré, archetype imposé)
  → upload résultats
  → Telegram (formatting : HTML + livraison message + livraison médias)
  → noeud Log final (même si échec, branche parallèle)
```
