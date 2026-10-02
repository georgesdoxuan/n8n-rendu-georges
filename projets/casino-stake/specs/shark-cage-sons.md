# Shark Cage — Ajout du son (SFX complets, style cartoon, sources CC0)

## Objectif
Le jeu Shark Cage (`web-sdk/apps/shark_cage`) est aujourd'hui 100 % visuel, sans aucun
son. Livrer un système audio complet (tous les éléments du jeu) avec des assets
licenciés proprement (CC0 en priorité), intégré proprement au moteur PixiJS/Svelte,
avec contrôles joueur. Résultat visible : une manche jouée dans Storybook produit un
son identifiable pour chaque événement du jeu.

## Contexte
- Jeu crash-game de descente en cage de requins, 3 zones de profondeur (Sunny
  Shallows 0–45 m, Twilight 45–105 m, Abyss 105 m+), créatures à effets
  (poissons, poisson-ange, tortue, dauphin, dauphin doré, baleine, poisson-globe,
  méduse, requin), roulette du dauphin (boost ×2 / slip ×0.8 / abyss), cash-out,
  jackpot, morts (shark / abyss).
- Trou d'immersion identifié via deux documents d'analyse (article Arshad 2025 :
  feedback audiovisuel intermédiaire optimal, stingers de win en majeur finissant
  en montée ; rapport EGM Livingstone 2017 : mélodies calibrées à l'ampleur du
  gain, cues conditionnés par créature, éviter les sons négatifs brutaux).
- Le projet a des garde-fous d'intégrité : `ladderState`, `ladderConfig`,
  `bookEventHandlerMap`, `bookSource*`, `typesBookEvent`, `config.ts` et
  `static/data/*.json` ne doivent PAS être modifiés (contrôle d'intégrité).

## Périmètre
* Inclus :
  - Assets sonores téléchargés et commités dans le repo (avec fichier de notice
    de licences).
  - Moteur audio Web Audio (unlock au premier geste, pools, volume, mute).
  - SFX pour : UI (clics, sélecteur de mise), descente, anticipation/slow-mo,
    heartbeat (le BPM est déjà calculé dans `scene.ts`), les 9 créatures avec
    une signature sonore distincte chacune, stamps de multiplicateur,
    roulette du dauphin (tours d'aiguille, atterrissage boost/slip/abyss),
    cash-out (pluie de pièces + stinger de win à 3 paliers calibrés),
    jackpot baleine, morts (requin, abyss — brèves, non brutales).
  - Boucles d'ambiance légères par zone de profondeur (bulles/grave — classées
    SFX, pas musique).
  - Contrôles : bouton mute + slider volume, persistés en localStorage.
  - Câblage dans `src/visual/` (le son est de la présentation, jamais de la
    logique certifiée).
* Exclu :
  - Musique d'ambiance composée (boucles musicales par zone) — chantier séparé.
  - Voix, text-to-speech.
  - Modification des fichiers sous contrôle d'intégrité.
  - Sons de near-miss cosmétiques supplémentaires (déjà couverts par heartbeat
    et anticipation).

## Affirmations
* A1. Chaque événement de jeu listé au périmètre déclenche un SFX audible :
  Vérification : manche jouée dans Storybook (`GAME/dive` → interactive), chaque
  créature/roulette/cash-out/mort entendu ; mapping vérifié dans le code
  (`grep` des clés SFX dans les séquences de `director.ts`).
* A2. Les 3 paliers de stinger de win (petit/moyen/jackpot) sont auditivement
  distincts et cohérents (majeur, fin en montée) :
  Vérification : écoute des 3 fichiers + revue du code de sélection du palier.
* A3. Le son démarre après le premier geste utilisateur (contrainte autoplay
  des navigateurs) et reste synchronisé avec les animations (pas de décalage
  perceptible sur slow-mo et roulette) :
  Vérification : run manuel dans Chrome/Storybook.
* A4. Mute et volume sont fonctionnels et persistés après rechargement :
  Vérification : toggle → rechargement de la page → état conservé (localStorage).
* A5. `prefers-reduced-motion` réduit aussi l'intensité sonore (flashs ×0.35
  déjà prévu visuellement) :
  Vérification : revue de code + test avec l'option système activée.
* A6. Chaque fichier audio commité provient d'une source à licence claire
  (CC0 Kenney en priorité, mixkit en complément), listée dans
  `src/visual/audio/LICENCES.md` :
  Vérification : fichier présent, licences vérifiables, téléchargements directs
  reproductibles.
* A7. Le build Storybook et le typecheck passent :
  Vérification : `pnpm build` / typecheck dans `web-sdk` au vert.

## Décisions prises
* Style cartoon/stylisé (cohérent avec le rendu DEEP INK) : validé par Georges.
  Alternative écartée : réaliste hydrophone (détonne avec l'art).
* Effets uniquement, pas de musique d'ambiance composée : validé par Georges.
  Perte : moins d'enveloppe sonore globale ; les boucles d'ambiance SFX
  (bulles, grave) compensent partiellement.
* Source Kenney CC0 en priorité, mixkit en complément si un son manque :
  validé par Georges. Freesound écarté (compte requis, licences par son).
  Pixabay écarté (téléchargements directs peu fiables).
* Moteur = Web Audio API natif, pas de bibliothèque : le jeu n'a aucune
  dépendance audio et les besoins (oneshots + boucles + volume) sont simples.
* Le son vit dans `src/visual/` (présentation) et se câble dans `director.ts` /
  `scene.ts` / composants UI — jamais dans `src/game/` (logique certifiée).
* Morts = stingers brefs et feutrés, pas de son négatif brutal (rapport EGM :
  ne pas briser l'immersion, inciter au rebet).
* Cohérence accessibilité : l'intensité audio suit la même logique que
  `prefers-reduced-motion` déjà implémentée.

## Hypothèses et risques
* Kenney CC0 couvre tous les SFX nécessaires ou presque ; si un son clé manque
  (ex. roue de roulette), mixkit le complète — sa licence gratuite permet
  l'usage commercial : le mapping exact sera dans LICENCES.md. Casse si : un
  son introuvable en licence propre → on le synthétise ou on le remplace par
  un équivalent CC0.
* Les URLs de téléchargement Kenney/mixkit sont directes et stables : si elles
  changent, recherche mannelle sur kenney.nl. Casse si : rien, un asset
  manuellement remplaçable.
* Le réglage "sweet spot" intermédiaire des stingers (article Arshad) est une
  question de calibrage perceptuel : les 3 paliers seront auditionnés et
  ajustés ; pas de critère automatique.
* Les boucles d'ambiance multi-zones (3) peuvent alourdir si mal gérées
  (fades) : prévoir crossfades courts et des boucles courtes (< 30 s).

## Questions ouvertes
* Volume par défaut au premier lancement (proposé : 80 %) — Georges peut
  ajuster après écoute.
* Un identifiant sonore de "danger imminent" (au-delà du heartbeat) est-il
  souhaité ? Proposé : non pour l'instant, le heartbeat suffit.
