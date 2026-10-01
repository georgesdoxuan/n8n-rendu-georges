---
name: spec-driven
description: |
 Avant d'écrire ou modifier quoi que ce soit : interroger Georges pour transformer une
 demande floue en spec courte, vérifiable et validée, écrite dans
 ~/Documents/GDX/Brume/specs/<nom>.md. Couvre le vrai objectif métier, le périmètre, les
 entrées/sorties exactes, les cas limites, les contraintes de coût/quota/credentials, et
 l'exploitation réelle (cron, échecs, qui est prévenu). Challenger les réponses au lieu de
 les enregistrer. Aucune implémentation tant que la spec n'est pas validée.
 À utiliser dès que Georges décrit un nouveau besoin, une nouvelle idée de workflow, ou dit
 « spec », « on part sur quoi », ou quand la demande tient en une phrase ambiguë.
---

# Spec-driven (adapté aux workflows n8n de Georges)

Une demande claire en apparence cache des décisions non prises. Cette méthode les force
AVANT le code, parce qu'après le code il est trop tard pour les poser gratuitement.

## 1. Interroger (questions ouvertes, pas questionnaire mécanique)

* **Le vrai objectif** : quel problème, pour qui, et comment saura-t-on que c'est réussi ?
 « Pourquoi » jusqu'à un résultat métier, pas une solution technique.
* **Le périmètre** : explicite aussi ce qui est EXCLU.
* **Entrées et sorties** : format exact, provenance, exemple réel (ex : « le run 8h03 écrit
 une ligne dans `brume_idees` avec prix en nombre »).
* **Cas limites** : API en 429, JSON cassé, table vide au premier run, run déclenché deux
 fois, prompt_image manquant.
* **Contraintes propres à cette infra** :
 - Coût par run et budget (ex : < 0,10 €/jour, crédit restant).
 - Quotas et modèles exacts (DeepSeek flash, Nano Banana 2 Flash).
 - **Credentials** : le MCP ne peut pas en créer : prévoir l'étape manuelle UI de Georges.
 - **Telegram** : un nouveau destinataire doit d'abord écrire au bot (impossible à
 automatiser côté bot).
 - **Cron** : actif = published ; un run silencieux qui échoue ne prévient personne : 
 qui doit être alerté, et comment ?
 - n8ncli : le workflow doit rester versionnable en code dans le repo.
* **Exploitation** : qui lance, à quelle fréquence, que se passe-t-il en cas d'échec, qui
 maintient, quand archive-t-on.

## 2. Challenger

* Reformuler l'hypothèse implicite et demander si elle est vraie (« tu pars du principe
 que le quota tiendra à 1 run/jour : vérifiable sur ai.dev/rate-limit »).
* Proposer au moins une alternative plus simple et dire ce qu'on y perd.
* Signaler les contradictions entre deux réponses au lieu de trancher en silence.
* Dire clairement quand une demande semble être une mauvaise idée, et pourquoi. Georges
 décide, mais en connaissance de cause. Une objection, sa raison, une proposition.

Continuer tant que les réponses font apparaître de nouvelles inconnues ; s'arrêter quand
elles ne changent plus rien à la spec.

## 3. Écrire la spec

Fichier : `~/Documents/GDX/Brume/specs/<nom-court>.md` (commitée dans le repo).

```markdown
# <Titre>

## Objectif
Une à trois phrases : le résultat attendu et pour qui. Pas de solution technique ici.

## Contexte
Ce qui existe déjà et ce qui motive le besoin.

## Périmètre
* Inclus : …
* Exclu : …

## Affirmations
Chaque affirmation est vraie ou fausse une fois le travail terminé, avec comment vérifier.
* A1. <énoncé vérifiable> : Vérification : <run réel + get_data_table_rows, get_workflow_execution, sips, …>
* A2. …

## Décisions prises
* <décision> : raison, alternative écartée.

## Hypothèses et risques
* <hypothèse non confirmée> : ce qui casse si elle est fausse.

## Questions ouvertes
* <question restée sans réponse>, qui doit y répondre.
```

Une bonne affirmation est observable sur l'infra réelle : « un run manuel produit une ligne
`brume_idees` avec `statut` renseigné » plutôt que « le logging marche ». Si une affirmation
ne peut pas être vérifiée, la reformuler ou la déplacer dans les risques.

## 4. Valider avant d'implémenter

Présenter la spec à Georges, demander sa validation explicite. Les questions ouvertes
doivent être visibles, pas enterrées. Ensuite seulement : implémenter avec la méthode
doubt-driven (chaque affirmation de la spec devient une preuve à collecter).
