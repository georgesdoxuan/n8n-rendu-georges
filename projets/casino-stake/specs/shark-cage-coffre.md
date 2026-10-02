# Shark Cage — Règle du coffre (chest event)

## Objectif
Ajouter un événement "coffre englouti" au jeu de descente : quand le coffre
apparaît, le joueur choisit OUVrir (tirage à 1/3 entre lingot d'or ×3.5, lingot
d'argent ×0.5, ou mort = pot à 0 et fin de plongée) ou PASSER (continuer la
descente avec le pot actuel). Le coffre remplace la moitié des apparitions du
fish_big, à tous les niveaux de profondeur, **dans les level books certifiés du
math-sdk**. Le coffre est un gamble à **EV positif** (4/3) dont le coût est
**prépayé** dans les level books par compensation (taux de référence ρ = 50 %
d'ouverture). Les résultats du coffre se résolvent par une **roue** (réutilisation
de la roulette dauphin, 3 secteurs 33/33/33, arrêt planifié anti-leak).

### Turtle split (décision 2026-10-02, même fournée)
Aux niveaux 5-10, la part fish_big (100 % tortue ×1.5) se scinde ~70/30 :
**fish_angel ×1.1** / **fish_turtle ×1.5** (arrondis 1 décimale ; L10 : 17.4 % →
12.2 + 5.2). Le reveal coffre **garde ×1.5** (le coffre remplace le « gros »
poisson — le split ne concerne que les apparitions directes, donc
fish_angel + fish_turtle == part fish_big == P(chest)). Le solver a été relancé :
le requin profond redescend (L8 50.8→39.9 %, L10 54.7→54.3 %), objectif 0.96500
inchangé. Deux events certifiés distincts (`fish_angel`/`fish_turtle`) — le front
mappe l'event sur la créature (plus d'heuristique multiplicateur pour ces classes).

### Conformité Stake (5ᵉ décision, 2026-10-02 — BLOQUANT soumission)
Validation Stake Engine rejetée : "RTP Range chest 100 %" et "Cross-Mode RTP
Consistency 3.6 % > 0.5 %". Contrainte définitive : CHAQUE mode dans [0.90, 0.967],
écart inter-modes ≤ 0.5 %, aucun override. Les gambles deviennent des modes à
marge comme ride (0.964) :
- **chest** : or ×2.5 / argent ×0.4 / mort ×0 (1/3) → RTP 2.9/3 = 0.96667.
- **shell** : perle ×2.0 / coquille vide ×0.9 / **perle sombre = MORT ×0** (1/3)
  → RTP 2.9/3 = 0.96667. Écart documenté : la directive disait "rien ×1.0" mais
  (2+1+0)/3 = 1.0 (hors bande) — la coquille vide paie ×0.9 pour tenir le 0.96667.
  La perle sombre ferme le coffre sur le plongeur : pot à 0, fin de plongée,
  deathCause 'shell' côté web (écran "DARK PEARL").
- **Compensation ρ=0.5 SUPPRIMÉE** (les gambles n'ajoutent plus d'EV) : chaque
  level book seul = 0.9650 exact, probas ≤ 1 décimale. Requin profond revu à
  des niveaux raisonnables (L5 14 %, L6 20 %, L7 24 % ; L9-L10 39-50 % —
  revalorisation ×1.5 contractuelle, documenté). rtp_upper_limits supprimé.
- Mesuré (13 LUT) : tous les modes ∈ [0.96465, 0.96666], spread max-min =
  0.266 % ≤ 0.5 %. Champs publiés (be_config / fe_config / index.json)
  recroisés avec les LUT — cohérents (le "chest 100 %" venait de l'upload
  précédent).
### Coquillage (shell) — contrat CORRIGÉ 2026-10-02
Même pattern que le coffre, prélevé sur le pool fish_small, avec une précision
contractuelle : **le reveal du coquillage est NEUTRE (×1.0)** — il ne coûte rien,
la plongée continue intacte. PUIS choix OPEN/PASS avec roulette :
- OPEN → roulette 1/3 **perle ×4** / 1/3 **rien ×1** / 1/3 **négatif ×0.5** (pot
  divisé par 2, la plongée continue — PAS de mort, pas de deathCause) ;
- PASS → garde le pot, continue.
Mode certifié "shell" = chained-round comme chest (issues 400/100/50 cents à
1/3, RTP 5.5/3 = 1.8333, hors bande comme chest, cap levée 1.84). Multiplicateurs
poissons revalorisés dans la même certification : angelfish ×1.2 (L1-4), tortues
×1.5 (L5-10) — le coffre porte le multiplicateur du fish_big remplacé.

## Contexte
- Pattern existant à répliquer : le dauphin (`dolphin_choice` → HOLD ON / PASS →
  roulette certifiée via `ride_books.json`). Le coffre suit le même modèle :
  phase de choix + résolution depuis un book certifié.
- Travail précédent : suite audio complète commitée (98409c5), backups sur les
  branches `backup/pre-chest-2026-10-01` et `backup/pre-chest-gold35-2026-10-01`.
- Décisions validées par Georges : **or ×3.5 / argent ×0.5 / mort**
  (3ᵉ décision coffre, définitive) ; moitié des fish_big remplacée **dans les
  tables certifiées math-sdk** ; mort = fin de plongée ; tous niveaux ;
  compensation pour joueur de référence ouvrant ρ = 50 %.
  **Ajouts 2026-10-02 (4ᵉ décision)** : angelfish ×1.2 (L1-4), tortues ×1.5
  (L5-10) ; coquillage prélevé sur fish_small avec **reveal NEUTRE ×1.0**
  (contrat corrigé — ne coûte rien par défaut), roulette perle ×4 / rien ×1 /
  négatif ×0.5 à 1/3 (négatif = pot ÷ 2, plongée continue, pas de mort) ;
  roulettes pour coffre ET coquillage (3 secteurs 33/33/33, roue dauphin
  généralisée) ; capot du coffre corrigé (charnière à l'arrière). Compensation
  étendue : ρ=0.5 pour chest ET shell, donateurs
  fish_small→jelly→puffer→dolphin→dolphin_gold→whale (planchers gardant
  chaque animal présent), probas à ≤ 1 décimale, objectif 0.96500 exact ± 5e-4.

## Périmètre
* Inclus :
  - Nouvelle clé d'événement `chest` dans la ladder + books de niveau
    (`static/data/*_books.json`) : moitié de la probabilité fish_big migrée
    vers chest, tous les modes (base…level10).
  - Nouveau book de résolution `chest_books.json` (mode `chest`, 400 books,
    sorties 1/3 or / 1/3 argent / 1/3 mort — cohérent avec le format ride).
  - Nouvelle phase `chest_choice` dans `ladderState` : actions `openChest()` /
    `passChest()` ; branche dans `resolvePhaseAfterLevel` ; respect du cap
    (cash-out forcé si pot×next.maxWin > LADDER_CAP).
  - UI de choix type dauphin : 3 cartes de cotes (33/33/33 %), boutons
    OPEN / PASS, hotkey Espace, message PASS montrant la somme conservée.
  - Visuel procédural DEEP INK : coffre qui apparaît, s'ouvre (or = flash +
    pluie de pièces ; argent = lueur discrète ; mort = le coffre se referme —
    mâchoire — puis écran de mort dédié, `deathCause: 'chest'`).
  - Audio : grincement d'ouverture, fanfare or, stinger argent, stinger mort
    bref (via le moteur existant `src/visual/audio/`).
  - MATHS : rééquilibrage des probabilités pour conserver RTP = 0.97 (voir
    hypothèses) + simulation Monte Carlo de vérification.
* Exclu : mécanique de perles/journal de plongée ; double-or ; multi-cash-out.

## Affirmations
* A1. À tous les niveaux, P(chest) = P(fish_big d'origine) / 2 et le fish_big
  garde l'autre moitié : Vérification — script de lecture des JSON des 11 modes.
* A2. Le book `chest_books.json` donne exactement 1/3, 1/3, 1/3 (± tolérance
  d'arrondi sur 400) : Vérification — comptage des sorties.
* A3. RTP simulé pour la grille des taux d'ouverture (reformulée, étendue au
  coquillage) : le RTP per-hop dépend des taux d'ouverture **par design**.
  Cellules Monte Carlo (taux ∈ {0, 0.5, 1} pour chest ET shell × profondeurs
  {1, 3, 6, cap}, pHold mixte, 2M plongées × 5 seeds/cellule) : ouverture=0 →
  0.9126-0.9310 ; **référence ρ=0.5 → 0.9649-0.9683, blended 0.9697** (gate
  analytique : book + ouvertures attendues = 0.9650 ± 5e-4 par niveau) ;
  ouverture=1 → 1.0000-1.0115. Fuite bornée : ±delta par hop de niveau
  (max L4 : passer 0.8853 / référence 0.9650 / ouvrir 1.0447) : Vérification —
  `scripts/simRTP.mjs` reproductible (descriptif).
* A3b. Shell : le reveal ×1.0 est neutre (pot intact, plongée continue) ; le
  négatif ×0.5 divise le pot sans mort ; pas de deathCause nouveau.
  Vérification — revue de code `ladderState.resolvePhaseAfterShell` + books
  certifiés (`shellReveal` 400/100/50 à 1/3).
* A4. Le flux jouable fonctionne : coffre → OPEN → roulette-équivalent → or/
  argent/mort ; PASS → décision suivante ; mort = fin de plongée avec écran
  dédié : Vérification — story GAME/dive interactive headless, zéro erreur
  console, phase atteinte.
* A5. Cash-out forcé au cap respecté aussi depuis chest_choice : Vérification
  — revue de code + test.
* A6. Build/typecheck au vert (storybook build, vite build, tsc) :
  Vérification — commandes réelles.
* A7. Les changements sous contrôle d'intégrité (ladderConfig, typesBookEvent,
  bookSource*, books JSON) sont limités à l'ajout coffre et documentés dans le
  commit : Vérification — git diff revue.

## Décisions prises
* Toucher aux fichiers certifiés est nécessaire (nouvelle mécanique de jeu) —
  Georges l'a décidé en lançant la mission ; le process DESIGN.md §12 s'applique
  (diff documenté, pas de modif cachée). Alternative écartée : simuler le
  coffre côté visuel uniquement — interdit par la charte d'intégrité.
* Or ×3.5 / argent ×0.5 : **directive de Georges (2026-10-01, 3ᵉ décision,
  définitive)** — le coffre est un gamble à EV 4/3 = 1.3333. Le coût est
  prépayé dans les level books certifiés : conversion fish_small→requin
  retirant `delta = rho × P(chest) × (1/3) × mult(reveal)` par niveau, pour un
  joueur de référence ouvrant **rho = 50 %** des coffres. Book seul ∈
  [0.9167 (L4), 0.9641 (L5)] (bande Engine respectée) ; book + ouvertures
  attendues = **0.9650 exact** par niveau. La carte argent présente honnêtement
  « YOU KEEP pot ×0.5 ». (La 2ᵉ décision « ×2.5 EV-neutre sans compensateur »,
  livrée dans f681cdb, est remplacée ; la roulette du dauphin, ride books et
  cotes HOLD ON sont hors périmètre et restent 47/3/50 ×2/×0.8, EV 0.964.)
* Moitié des fish_big convertie **dans les tables math-sdk** (commit 4566a35) :
  le reveal `chest` paie exactement le multiplicateur du fish_big remplacé
  (×1.0 niveaux 1-4, ×1.1 niveaux 5-10) ; quotas par classe exacts via le
  check de repeat apparié sur l'événement (fish_big et chest partagent un
  multiplicateur — l'appariement sur le payout brouillerait les quotas).
* Mort = fin de plongée (pot 0, deathCause 'chest') : validé par Georges.
* Sorties du coffre au book séparé (comme ride) plutôt qu'embarquées dans le
  level book : cohérent avec l'architecture existante et certifiable.
* Conséquence de la compensation (documentée) : toujours-passer < 0.965 <
  toujours-ouvrir ; l'écart max par hop de niveau est ±delta (L4 : 0.9167 /
  0.9650 / 1.0133). Le mode chest (EV 1.3333) est hors bande Engine par design ;
  la cap 0.967 est levée côté math-sdk (`rtp_upper_limits['chest'] = 1.34`).
* Backup : branches `backup/pre-chest-2026-10-01` (commit 98409c5) et
  `backup/pre-chest-gold35-2026-10-01` créées avant les modifications.

## Hypothèses et risques
* EV-neutralité niveau par niveau : le reveal coffre garde le multiplicateur du
  fish_big remplacé (×1.0 niveaux 1-4, ×1.1 niveaux 5-10 — le poisson-ange paie
  ×1.1 en profondeur). Un reveal figé à ×1.0 partout rognerait 0.1×P(fish_big)/2
  de l'EV des niveaux 5-10 (détecté par la sim : −0.007 RTP sur la cellule cap,
  corrigé). Aucun autre ajustement n'est nécessaire ni autorisé.
* Ouvrir ajoute des hops à EV 4/3 vs la baseline 0.965 : le RTP per-hop dépend
  du taux d'ouverture (A3 reformulée). La fuite est bornée par ±delta par hop de
  niveau et le ρ réel des joueurs reste proche de la référence 50 % (choix
  par défaut de l'UI, cartes de cotes affichées 33/33/33).
* Les 100 000 books certifiés donnent 33333/33333/33334 — tolérance d'arrondi
  assumée, affichage 33/33/33 ; EV empirique du book 1.33332 ≈ 4/3.
* `deathCause` étendu à 'chest' : vérifier qu'EndScreen et DiveDirector gèrent
  une nouvelle cause (défaut : repli sur 'shark' visuellement).

## Questions ouvertes
* Apparence finale du coffre (bois/fer ? trésor doré ? mâchoires ?) — proposé :
  coffre au trésor classique DEEP INK, intérieur sombre, lueur or/argent ;
  Georges valide visuellement dans Storybook.
