---
name: revue-hostile
description: |
 Revue d'attaque d'un workflow n8n, d'un repo ou d'un branchement : pour chaque frontière
 (secrets, entrées, accès, dépendances, défaillances), chercher un scénario d'attaque ou de
 panne concret, attaquer aussi l'angle performance/coût, vérifier chaque constat avant de
 l'affirmer, et produire un rapport classé par gravité réelle dans le contexte de Georges.
 À utiliser quand Georges dit « revue hostile », « attaque ça », « cherche les problèmes »,
 avant d'activer un cron, avant de rendre un repo public, ou après tout ajout de credential,
 de webhook ou de déclencheur.
---

# Revue hostile (adaptée à l'infra n8n + repo de Georges)

Objectif : trouver ce qui casse ou qui fuite avant que ce soit Georges qui le découvre.
Constat faux = crédibilité détruite : on relit le code ou on reproduit avant d'affirmer.

## 1. Frontières à attaquer, avec scénarios concrets pour CE setup

* **Secrets** :
 - `grep -r "sk-\|AQ\." n8n/workflows/ .` dans le repo : toute clé en clair dans un
 `.workflow.ts` ou un nœud = constat majeur (historique : c'était le cas avant v11).
 - Token MCP : où il vit (`~/.n8ncli-global.json`, `AltBrat/n8n/CLES-API.md`) : portée
 (publier/dépublier/exécuter des workflows), qui d'autre le lit, rotation possible.
 - Workflows tiers pullés dans le repo : ils peuvent contenir des tokens de bots en clair
 (déjà observé chez un workflow AltBrat) : scanner AVANT tout commit.
* **Entrées non fiables** : réponses LLM (JSON cassé, champ manquant → parse strict et
 erreur explicite, jamais de fallback silencieux), contenu Telegram entrant, données de
 table lues puis réinjectées dans un prompt.
* **Accès** : endpoint MCP exposé sur Internet avec un JWT : qui peut le réutiliser ;
 repo GitHub public vs privé ; workflows **actifs** avec des triggers (chacun est une
 porte d'entrée exécutée sans humain) ; chat_ids Telegram (donnée perso) dans les fichiers
 versionnés.
* **Données sensibles** : RGPD le jour où la boutique aura de vraies clientes (les outils
 n8n lisent commandes/clientes) ; journaux d'exécution n8n qui stockent images 1,4 Mo.
* **Dépendances et tiers** : modèles image/LLM qui changent d'ID ou de réponse (déjà vécu :
 `gemini-2.5-flash-image` remplacé par `gemini-3.1-flash-image`), quota qui s'épuise,
 paquet npm à 5 téléchargements/semaine détenant un token (n8ncli).
* **Défaillances** : échec à moitié (Gemini en 429 → log OK mais pas d'image : déjà arrivé),
 cron relancé après un plante → doublon dans `brume_idees` (l'insert n'est pas idempotent),
 erreur avalée dans une branche parallèle, workflow actif qui échoue chaque matin en
 silence (personne n'est notifié de l'échec lui-même).

## 2. Angle performance et coût

Chiffrer plutôt qu'affirmer :
* Coût par run × fréquence = coût/jour (et crédit restant ÷ coût/jour = jours restants).
* Quotas API : à partir de quel volume le plan gratuit/5 € casse ?
* Stockage n8n : exécutions avec images en base, table `brume_idees` qui croît sans borne,
 vieilles exécutions jamais purgées.
* Boucles d'appels (chaque item = 1 appel) ; absence de cache ; travail refait à chaque run.

## 3. Vérifier avant d'accuser

Pour chaque constat : relire le nœud/le fichier, ou reproduire (run de test). Distinguer
**Confirmé** (reproduit ou lu dans le code) de **Plausible** (scénario tenu mais dépend
d'un élément non vérifié : dire lequel). Écarter le goût et le style.

## 4. Rapport

Classer du plus grave au moins grave, gravité = impact réel chez Georges (un secret dans
un repo privé solo ≠ dans un repo public ; un cron silencieux qui échoue ≠ une faute de
style). Format :

```markdown
# Hostile review : <cible>

## Verdict
Une phrase : peut partir / à corriger avant / à ne pas déployer.

## Constats
### [Critique|Élevé|Moyen|Faible] <titre court> : Sécurité|Performance
* Où : `fichier:ligne` ou nom du nœud
* Scénario : entrée ou situation précise → conséquence
* Statut : Confirmé | Plausible (dépend de …)
* Correction proposée : …

## Ce qui a été vérifié et tient
(liste courte : l'absence de constat ne doit pas être confondue avec l'absence d'examen)

## Non examiné
(ce qui n'a pas pu être revu, et pourquoi)
```
