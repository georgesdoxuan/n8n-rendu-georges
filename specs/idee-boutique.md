# Spec : workflow Idée boutique → mockup duo → Telegram

Spec validée rétroactivement (le projet a suivi cette méthode dès le premier jour ;
ce fichier formalise le résultat au format du cours).

## Objectif

Recevoir chaque matin sur Telegram une idée de boutique e-commerce nouvelle, avec sa
fiche (nom, pitch, niche, produit, prix) et un visuel carré composé de deux écrans
mobiles (page d'accueil et page produit) généré par IA, le tout pour un coût
quotidien inférieur à 0,10 €. Pour : Georges, dans le cadre d'un cours n8n.

## Contexte

Instance n8n auto-hébergée. Le projet démarre d'une demande simple (idée de boutique
plus mockups) et grandit par itérations : choix des modèles, évolution du prompt,
anti doublons, log, versionnement en code.

## Périmètre

* Inclus : génération de l'idée, génération de l'image, envoi Telegram, log en data
 table, anti doublons par historique, versionnement du workflow en TypeScript.
* Exclu : création de vraies pages web, analyse de marché réelle (SEMrush), choix du
 fournisseur (vérification DSers manuelle), notification d'échec du run.

## Affirmations

* A1. Un run manuel produit une ligne dans la data table `brume_idees` avec nom,
 pitch, niche, marché, produit et prix. Vérification : `get_data_table_rows` après
 un run réel.
* A2. Le run du matin part à 8h00 pile. Vérification : lecture du cron sur la version
 publiée du workflow (`0 8 * * *`).
* A3. Le destinataire reçoit une fiche texte et une image carrée 1:1 contenant deux
 écrans. Vérification : réponse `ok: true` des nœuds Telegram, lecture visuelle de
 l'image extraite de l'exécution (dimensions mesurées : 1024 × 1024).
* A4. L'idée générée est disjointe des idées déjà loguées. Vérification : comparaison
 de la niche et du nom avec les 40 dernières lignes de la table.
* A5. Le coût par run est inférieur à 0,10 €. Vérification : chiffrage DeepSeek
 (environ 0,0001 €) + 1 image Nano Banana 2 Flash.
* A6. Aucune clé API n'est visible dans le code versionné. Vérification : scan des
 motifs de secrets sur le repo (0 occurrence).

## Décisions prises

* DeepSeek flash pour l'idée : le moins cher, JSON forcé. Raison : coût quasi nul ;
 alternative écartée : GPT, trop cher pour un usage quotidien.
* Nano Banana 2 Flash pour l'image (remplaçant OpenAI puis gemini-2.5-flash-image) :
 crédit Google existant, moins de 0,10 € par jour. Alternative écartée : DALL·E via
 OpenAI (1,36 € de crédit seulement).
* Data table n8n plutôt que Google Sheets : aucune authentification Google
 exploitable et le sandbox Code n8n interdit la signature JWT d'un compte de
 service. Alternative écartée : Apps Script (action manuelle plus longue).
* Nœuds HTTP Request avec credentials Header Auth plutôt que nœuds Code : le nœud
 Code ne peut pas lire les credentials. D'où des nœuds "préparer appel" en amont.
* Exclusions injectées dans le prompt (barrière logicielle) plutôt que filtrage dur :
 la simplicité prime ; la détection de doublon reste possible à postériori dans la
 table.

## Hypothèses et risques

* Le quota et le crédit Google restent disponibles : si le quota casse, le run échoue
 silencieusement (seul le log survit). Qui surveille : Georges, sur ai.dev/rate-limit.
* L'identifiant du modèle image peut changer chez Google (déjà arrivé deux fois).
* La reproductibilité des textes français dans l'image n'est pas garantie (limite du
 modèle d'image ; les consignes réduisent le risque sans l'annuler).

## Questions ouvertes

* Personne n'est notifié quand le run échoue : faut-il ajouter une alerte Telegram
 sur la branche d'erreur ? À trancher en évolution.
* Le log n'est pas idempotent (relance = doublon) : faut-il une clé de déduplication ?
 À trancher en évolution.
