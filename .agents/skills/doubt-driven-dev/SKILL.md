---
name: doubt-driven-dev
description: |
 Méthode de travail où chaque résultat est considéré comme faux tant qu'il n'a pas été
 vérifié par une preuve observée sur l'infra réelle (n8n, repo, Telegram, data tables),
 et où le travail est critiqué en boucle jusqu'à ce qu'il ne reste plus de doute sérieux.
 À utiliser dès que Georges dit « doute », « es-tu sûr », « vérifie », « critique ton
 travail », ou pour toute modification de workflow n8n actif, tout push sur le repo, toute
 touche à un cron, un credential ou un déploiement : même sans demande explicite.
---

# Doubt-driven development (adapté au setup n8n de Georges)

« Ça devrait marcher » n'est pas un résultat, et sur cette infra, un message d'outil
positif ne prouve presque jamais le résultat. Une affirmation n'est vraie que si elle a été
**observée** sur l'état réel. Le travail n'est terminé que quand la critique ne trouve plus
rien de sérieux.

## 1. Avant : définir « terminé » comme liste d'affirmations vérifiables

Écrire les affirmations qui devront être vraies, chacune avec SA méthode de vérification
sur CETTE infra. Boîte à outils de preuve, par ordre de fiabilité :

| Affirmation type | Preuve à observer (pas l'outil, l'état) |
|---|---|
| Le workflow fonctionne | `execute_workflow` en run réel + `get_workflow_execution` : `status: success` ET runData complet (pas juste le premier nœud) |
| Le cron tournera | `get_workflow_details` : `active: true` + paramètre cron relu dans les nodes |
| Le run a logué | `get_data_table_rows` : la ligne existe, colonnes correctes |
| Le message part | La réponse Telegram (objet `ok: true` + `message_id`) : et demander à Georges ce qu'il a reçu |
| Le push a déployé | `n8ncli status` propre + workflow distant relu via MCP (le contenu, pas le succès du push) |
| Le repo est propre | `git diff --cached` scanné à la recherche de motifs secrets (`sk-`, `AQ.`, tokens) |
| L'image est correcte | `sips -g pixelWidth/pixelHeight` + lecture visuelle du PNG extrait |

Pièges déjà rencontrés sur ce projet (ne pas les reproduire) :
* `publish: success` ≠ workflow actif ; `valid: true` ≠ run réussi.
* `create_workflow_from_code` crée un **nouvel ID** : relire l'URL et l'ID, et archiver l'ancien soi-même.
* Le sticky note dans n8n a déjà divergé du fichier source : une modif faite via MCP sur l'instance n'écrase pas la source `.ts` du repo : synchroniser les deux explicitement.
* Une branche parallèle qui réussit peut coexister avec une branche en erreur : le statut global est `error` mais le log est OK : dire les deux.

## 2. Pendant : petits pas, effet réel relu après chaque pas

Après chaque étape qui change quelque chose, relire l'état réel : l'exécution n8n nœud par
nœud, la table, le fichier, la version en ligne. Quand deux sources se contredisent
(`n8ncli status` dit à jour, le MCP montre autre chose), ne pas choisir celle qui arrange :
trouver pourquoi elles divergent, et le dire tant que c'est inexpliqué.

## 3. Après : boucle de critique (changer de rôle et attaquer)

Relire le livrable comme si quelqu'un d'autre l'avait écrit et qu'il fallait prouver qu'il
est faux :

* **Hypothèses** : qu'ai-je supposé sans vérifier ? (nom exact d'un nœud avec accents,
 ID de credential, format de réponse d'API, champ `prompt_image` présent, fuseau du cron)
* **Cas limites** : table `brume_idees` vide au premier run, réponse DeepSeek hors JSON,
 Gemini en 429, prompt_image manquant, exécution déclenchée deux fois.
* **Valeurs silencieusement fausses** : un `|| 'aucune'` qui transforme une exclusion vide
 en consigne ambiguë ; un prix `39.9` rendu « 39.9 EUR » ; un `status` par défaut qui
 ment sur l'image.
* **Demande d'origine** : relire le message initial de Georges. Le résultat répond à ce
 qui a été demandé, ou à ce que j'ai compris au milieu ?
* **Effets de bord** : ancien workflow archivé ? sticky source vs instance ? SPECS.md
 synchronisé ? repo commité ? capture workflow temporaire toujours actif ?
* **Preuve** : pour chaque affirmation de l'étape 1 : observation ou seulement un raisonnement ?

Pour chaque doute : le lever par une vérification, corriger, recommencer la boucle sur ce
qui a changé. S'arrêter quand un tour complet ne trouve plus rien de sérieux. Un doute
inlevable se note et se remonte : ce n'est pas une raison de tourner en rond.

## 4. Rendre compte sans embellir

```markdown
## Vérifié
* <affirmation> : preuve : <ce qui a été observé, où>

## Non vérifié
* <affirmation> : pourquoi, et comment Georges peut le vérifier lui-même

## Problèmes trouvés en route
* <problème> : corrigé / restant, avec l'impact
```
