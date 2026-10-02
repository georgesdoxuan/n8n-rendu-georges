# Revue hostile : workflow Idée boutique → mockup duo → Telegram

Date : 2026-09-30. Cible : workflow n8n `XjOlFNKF3ldjsVBO` (actif, cron 8h00), le repo
GitHub et les dépendances (DeepSeek, Google AI Studio, Telegram, n8ncli).
Méthode : skill `revue-hostile` (scénarios par frontière, vérification avant accusation,
gravité = impact réel dans le contexte du projet).

## Verdict

À corriger avant : un constat critique trouvé, corrigé et reverifié pendant la revue
(détail en constat n°1). Le reste est du moyen ou du faible, acceptable pour un projet
de cours en l'état.

## Constats

### [Critique] Le cron déployé ne correspondait pas à la spec : Défaillance
* Où : nœud déclencheur, workflow `XjOlFNKF3ldjsVBO`.
* Scénario : la spec et le sticky annoncent un run à 8h00, mais la version publiée
 tournait à 9h07. Cause racine : une correction appliquée directement sur l'instance
 (via MCP) avait été écrasée au recréation suivante du workflow depuis une source
 locale plus ancienne. Le run quotidien fonctionnait, à la mauvaise heure, sans que
 rien ne l'indique.
* Statut : Confirmé (lecture de la version publiée : `7 9 * * *`).
* Correction : cron fixé à `0 8 * * *`, renommé "Chaque matin 8h00", republié, puis
 reverifié sur la version active (`0 8 * * *` confirmé).

### [Élevé] Échec silencieux du run quotidien : Défaillance
* Où : workflow complet.
* Scénario : si DeepSeek ou Gemini est en panne (quota, 429, réseau), le run échoue
 et personne n'en est informé. Seule la branche log survivrait, sans image ni message.
* Statut : Confirmé (aucun mécanisme de notification d'erreur dans le workflow).
* Correction proposée : ajouter un nœud d'alerte sur la branche d'erreur (catch) qui
 envoie un message Telegram "run en échec" à Georges. Non implémenté (hors périmètre
 du rendu, à faire en évolution).

### [Élevé] Le log n'est pas idempotent : Défaillance
* Où : nœud "Log idée (table n8n)".
* Scénario : une relance du workflow (retry manuel, rejeu d'une exécution) insère une
 deuxième ligne pour la même idée. La table `brume_idees` (18 lignes au 30/09) ne
 cesse de croître, sans borne ni déduplication.
* Statut : Confirmé (lecture du nœud : insertion systématique).
* Correction proposée : clé de déduplication sur la date ou un hash de l'idée, ou un
 nœud rowExists avant insertion. Non implémenté.

### [Moyen] Image base64 stockée dans les exécutions n8n : Performance
* Où : exécutions du workflow.
* Scénario : chaque run embarque une image d'environ 1,4 Mo dans les données
 d'exécution. Sans purge des anciennes exécutions, la base n8n grossit sans fin.
* Statut : Confirmé (taille mesurée sur les images générées : 1,39 à 1,68 Mo).
* Correction proposée : rétention d'exécutions courte sur ce workflow, ou purge
 périodique. Non implémenté.

### [Moyen] Token d'accès MCP à portée large : Sécurité
* Où : `~/.n8ncli-global.json` (hors repo) et serveur MCP de l'instance.
* Scénario : le token permet de créer, modifier, publier et exécuter des workflows.
 S'il fuite (machine compromise, copie), toute l'instance est pilotable. Aucune
 expiration visible.
* Statut : Confirmé (portée listée par les outils MCP).
* Correction proposée : rotation périodique du token, révocation dans l'UI n8n en cas
 de doute. Accepté pour un projet de cours.

### [Moyen] chat_id Telegram en clair dans le workflow versionné : Sécurité
* Où : nœuds Telegram, fichier `.workflow.ts` du repo (privé).
* Scénario : le chat_id de Georges est une donnée personnelle visible dans le code.
* Statut : Confirmé, puis résolu le 30/09 : le chat_id a été déplacé dans la
  data table `brume_config` et lu au runtime (run de test vérifié : message
  Telegram délivré, message_id 55, avec le chat_id lu depuis la table). Le repo
  peut passer public sans exposer de donnée personnelle.

### [Faible] Identifiant de modèle image non épinglé côté fournisseur : Dépendances
* Où : nœud Gemini.
* Scénario : Google remplace ses modèles (déjà vécu : `gemini-2.5-flash-image` devient
 `gemini-3.1-flash-image`). Un jour l'ID appelé peut disparaître et le run plantera.
* Statut : Plausible (dépend de la politique de retrait de Google).
* Correction proposée : vérification manuelle occasionnelle, ou test hebdomadaire.

### [Faible] Coût non borné par construction : Performance
* Où : run quotidien.
* Chiffrage : moins de 0,10 € par run, soit environ 3 € par mois. Avec 5 € de crédit,
 environ 50 jours de marge. Acceptable, mais le crédit n'est pas surveillé.
* Statut : Confirmé (chiffres du SPECS).

## Ce qui a été vérifié et tient

* Aucune clé API en clair dans le code : scan des motifs `sk-`, `AQ.`, tokens sur tout
 le repo (0 occurrence), vérifié à nouveau sur les fichiers `.workflow.ts`.
* Les clés vivent dans des credentials n8n Header Auth (DeepSeek, Gemini), le token
 Telegram dans un credential Telegram API.
* Le workflow publié est actif, cron `0 8 * * *`, et un run réel du 30/09 à produit
 une idée, une image et un log (exécution 70, statut success, table relue).
* L'anti doublons lit bien les 40 dernières lignes de la table avant chaque run
 (vérifié en exécution : idée générée disjointe de l'historique).
* Le prompt interdit les secrets et le repo est privé.

## Non examiné

* Le code interne du paquet npm `n8ncli` (audit de supply chain prévu, non réalisé).
* La configuration du serveur n8n lui-même (hors périmètre du cours).
* Les autres workflows de l'instance (hors projet).
