# Playbook : une VSL en motion design avec Claude Code

Ce qu'a appris la production de la VSL OpenClimat (fournisseurs), réalisée le 4 octobre 2026 en une session d'environ 3 h 30, du guide d'origine jusqu'aux deux MP4 livrés. Le document sert de squelette pour les prochaines vidéos. Le skill `motion-design` l'applique.

- **Skill** : ce dossier (`scripts/` pour les outils génériques, `templates/` pour les gabarits ; `templates/motion.config.example.json` contient la configuration complète du projet OpenClimat)
- **Livrables** : `OpenClimat-VSL-fournisseurs-web.mp4` et `…-linkedin.mp4` (1 min 31, 1080p, 30 i/s)

---

## 1. Origine : la méthode Agence OOO

Source : [saas-ooo.vercel.app/lm/vsl-motion-design](https://saas-ooo.vercel.app/lm/vsl-motion-design), un guide gratuit d'Agence OOO. Il explique comment produire une VSL (vidéo de vente) de 2 min en code, sans logiciel de montage.

Les principes que nous avons gardés :

1. **La structure avant l'animation** : un script en 8 blocs (accroche → problème → croyance à casser → résultats → méthode → preuve sociale → offre → un seul CTA), écrit en langage parlé.
2. **Une voix témoin** (synthèse) pour caler les animations, remplaçable ensuite par une vraie voix.
3. **Une charte en variables CSS** : fond sombre, texte clair, une seule couleur d'accent réservée aux mots-clés, polices locales.
4. **Une scène HTML/GSAP par idée**, et chaque animation déclenchée sur un mot précis de la voix.
5. **Trois règles de motion** :
   - transitions toujours dans le même sens (sortie à gauche, entrée par la droite, power4, ~12 % de la largeur) ;
   - aucune animation décorative de « respiration » ;
   - 0,3 à 0,75 s de silence avant une punchline.
6. **Sound design minimal** : clic de transition, pop d'apparition, montée de tension coupée net sur le mot-clé, carillon de révélation, musique compressée par la voix. La formule ffmpeg : `sidechaincompress=threshold=0.06:ratio=2:attack=350:release=1400:knee=8`.
7. **Recalage temporel** (time-mapping) : on compare la voix témoin et la voix finale mot à mot, puis on recale les animations.
8. **Contrôle qualité automatique** (sauts d'image, images figées, écrans vides, chevauchements audio, -14 LUFS) et **deux exports** : web (`libx264 -preset slow -crf 24 -movflags +faststart`, AAC 128k) et LinkedIn (bandeau CTA fixe en verre dépoli).

Les 10 pièges listés par le guide : points de suspension dans le texte de synthèse, polices chargées depuis le web, logo qui tourne, emojis comme métaphores, prises ratées laissées dans le mix, coupes audio imprécises, courbe de temps non lissée, fenêtres de scène mal alignées, musique qui « pompe », bandeau CTA qui masque le contenu.

## 2. Comment tout se branche ici

| Étape | Outil | Remarques |
|---|---|---|
| Script, scènes, timing, contrôle qualité | Claude Code + skills HyperFrames (`/hyperframes` → `/general-video` en mode compagnon) | HyperFrames rend du HTML/GSAP en MP4 via Chrome |
| Rendu | `npx hyperframes render` (version figée dans `package.json`) | `-q delivery`, environ 2 min pour 90 s |
| Audio | ffmpeg (Homebrew) | sons synthétisés, mix et normalisation |
| Voix | **HeyGen** (`heygen voice speech create`) | renvoie l'audio et les timestamps mot à mot |
| Vérification de prononciation | `npx hyperframes transcribe -m medium -l fr` | whisper.cpp ; `small.en` est anglais uniquement |
| Récupération de la marque | `curl` des CSS et du HTML du site | couleurs, polices, logos |
| Aperçu | Studio HyperFrames (`npx hyperframes preview --background`), panneau navigateur de l'app | |

## 3. Le squelette, étape par étape

```
0. Intention     → cible unique, message, durée, destination (web / LinkedIn)
1. Recherche     → pages du site : faits publics, chiffres, témoignages, charte
2. Script        → 8 blocs, ton parlé, validé AVANT toute animation
3. Storyboard    → STORYBOARD.md + storyboard.html (croquis statiques), validé
4. Voix témoin   → 2 essais de voix sur l'accroche ; l'utilisateur choisit à l'oreille
5. Build         → 1 sous-composition par bloc, cues /*CUES*/ injectés
6. Recalage      → build_timeline.py (silences, tenues, bornes des scènes)
7. Sound design  → build_audio.py (bruitages, musique, sidechain, -14 LUFS)
8. Contrôle      → hyperframes check, captures aux moments clés, freezedetect, transcription
9. Studio        → l'utilisateur regarde et donne ses retours, on itère
10. Rendu        → 2 masters (web, linkedin=true), encodage OOO, copie sur le bureau
```

Commandes du skill (`S=<dossier du skill>/scripts`) :

```bash
python3 $S/heygen_tts.py texte.txt <voice_id> audio/voix            # → voix.wav + voix.words.json
python3 $S/build_timeline.py . audio/voix.wav audio/voix.words.json # recalage + injection
python3 $S/build_audio.py .                                         # bruitages + musique + mix
npx hyperframes check                                               # 0 erreur attendue
npx hyperframes render -o renders/master-web.mp4 -q delivery
npx hyperframes render -o renders/master-linkedin.mp4 -q delivery --variables '{"linkedin":true}'
```

## 4. Pré-production : ce qui a compté

- **Une seule cible par vidéo.** Notre v1 mélangeait des arguments côté fournisseur et côté enseigne. L'utilisateur l'a repéré tout de suite. Écrire du point de vue d'un seul lecteur (« vos enseignes », pas « vos fournisseurs »).
- **Seulement des faits publics et sourcés**, surtout pour une démo. Les chiffres viennent du site (200+ industriels, 15+ enseignes). La citation SEB est reprise mot pour mot, avec son auteur.
- **Accroche courte** : trois exemples suffisent. Cinq, c'était trop long, selon le retour de l'utilisateur.
- **CTA promotionnel et court** : « Une donnée, un format. Rejoignez le réseau ! ».
- **Le fil rouge** : un objet récurrent (la « fiche climat ») qui revient aux scènes 1, 4, 5 et 8. C'est ce qui donne de la cohérence au film.

## 5. Charte et assets : les pièges

- **Couleurs** : les extraire du CSS du site (`curl` des chunks `_next/static/*.css`, puis compter les `#hex`). OpenClimat : marine `#000C3F`, surface `#031356`, accent menthe `#98EEE2`, bleu `#3D6DBA`.
- **Polices** : la police de titre du site (MoskauGrotesk) est commerciale. On utilise Poppins et Inter (licence OFL), téléchargées en woff2 depuis `@fontsource` et servies localement.
- **Logos d'enseignes** : les PNG du site sont des carrés de 384 px avec un anneau gris incrusté. On les nettoie avec ImageMagick (masque circulaire puis `-trim`). Certains SVG ne sont qu'un PNG encapsulé dans un `<pattern>` : on extrait le base64, on l'aplatit sur blanc, puis on rogne.
- **storyboard.html** : il doit être autonome (polices et logos encodés en base64) et peser **moins de 512 Ko**, sinon le panneau d'aperçu de l'app ne l'affiche pas. Réduire les logos (JPEG 200 px sur fond blanc).

## 6. La voix : toutes nos difficultés

| Problème | Ce qui s'est passé | Solution |
|---|---|---|
| Clé ElevenLabs refusée | L'utilisateur avait collé un *key ID*, pas une clé (`api_key_id_used_as_api_key`) | Les vraies clés commencent par `sk_`. Ne jamais stocker un ID. |
| ElevenLabs bloqué | « Unusual activity, Free Tier disabled » (VPN ou comptes multiples) | Passer à HeyGen (ou à un compte ElevenLabs payant) |
| HeyGen | Outil à installer, puis `heygen auth login --oauth` (fait par l'utilisateur) | L'OAuth donne le crédit gratuit, une clé API est payante |
| Crédit HeyGen | Environ **2 min de voix gratuites par mois** : 82 s demandées, 39 s restantes | Régénérer **une seule phrase** et la recoller avec `splice_block.py` |
| « RSE » | L'écriture phonétique « air aisse eu » est entendue « Rest sûre ». « R.S.E. » passe isolé mais devient « RCS, eux » dans le paragraphe | **SSML** `<say-as interpret-as="characters">RSE</say-as>`, généré seul puis recollé |
| « SEB » | Il se prononce « Seb » (comme Sébastien), pas « S.E.B. » | Écrire « Seb » dans le texte envoyé à la synthèse |
| « OpenClimat » | Lu à l'anglaise (« Openclimate ») | Écrire « Open Climat » |
| Blanc avant « quand ? » | C'est mon outil qui ajoutait 0,5 s de silence au milieu d'une phrase | **Jamais de pause à l'intérieur d'une phrase.** Mettre la tenue *après* la punchline (`extra_gap` de la scène suivante). |
| Transcription | whisper `small.en` est anglais uniquement | `-m medium -l fr` |

Règle d'or : **vérifier la prononciation en transcrivant la phrase remise dans son contexte**, et même dans le MP4 final, jamais seulement la phrase isolée. Faire écouter les essais avec une page de lecteurs audio autonome (base64) et une copie sur le bureau.

Voix HeyGen françaises : **Audrey** `7459d7aa599b4f97908600896a0e7ef4` (dynamique, retenue) et **Chloé** `4b1de1582d2c477485ad2e0c2717f0ff` (plus posée).

## 7. Le build HyperFrames : l'architecture qui marche

- **Un fichier par bloc** : `compositions/sN-nom.html`, en `<template>`. La racine porte `id` = `data-composition-id` = clé de `window.__timelines`. Dans `index.html`, l'hôte s'appelle `id="h-sN-nom"`.
- **Cues injectés** : `const C = /*CUES*/{...}/*END*/;`. Toutes les animations s'écrivent en `C.mot ± décalage`, plus `C._dur` pour la sortie. Changer de voix ne demande donc aucune retouche manuelle des scènes.
- **Sélecteurs limités à la scène** : `const R = document.getElementById(id)`, `$` (premier élément) et `$$` (tous). Bug rencontré : `$(".sheet")` n'effaçait que le premier tableau, il fallait `$$`.
- **Travelling (scène méthode)** : un `.world` de 4 stations espacées de 1400 px. On le déplace en `x` sur `power3.inOut`, en arrivant pile sur le mot, et on efface la station précédente, sinon elle déborde dans le cadre.
- **Erreurs de lint rencontrées** (à éviter d'emblée) :
  - tween sur `left`/`top` (`gsap_non_transform_motion`) : utiliser `x`/`y` ;
  - `transform` CSS sur un élément animé par GSAP (`gsap_css_transform_conflict`) : poser `rotation` via `tl.set` ;
  - même image deux fois dans une scène (`duplicate_media_discovery_risk`) ;
  - textes qui se chevauchent : boîtes de glyphes trop proches (compteur 260 px, guillemet 300 px, numéros de station) ;
  - piste audio plus courte que son créneau (`clip_media_fit`).
- **Le Studio réécrit les fichiers** (il ajoute `data-hf-id` avant les autres attributs). Les regex des outils doivent donc tolérer l'ordre des attributs (`<div[^>]*?\sid="h-…"`).

## 8. Recalage (`build_timeline.py`)

- **Entrées** : la prise de voix, `words.json` (`[{text,start,end}]`) et `motion.config.json` (scènes, premier mot, cues).
- **Insertions de silence** : `lead_in` 0,5 s au début ; `scene_gap` 0,35 s avant chaque scène ; `extra_gap` par scène, pour laisser respirer la punchline précédente (0,3 à 0,8 s) ; `pauses` avant une punchline, **en début de phrase seulement** (« Et si c'était… » 0,75 s, « Rejoignez » 0,5 s).
- **Coupe** : au milieu du blanc qui précède le mot.
- **Bornes** : chaque scène commence 0,3 s avant son premier mot. Le lockup final est tenu `tail` = 2,4 s.
- **Point à surveiller** : une punchline trop proche de la sortie de scène (la bulle « ? » arrivait 0,1 s avant la transition). On corrige avec `extra_gap` sur la scène suivante.

## 9. Sound design (`build_audio.py`)

- **Tout est synthétisé avec ffmpeg** (`aevalsrc`, `anoisesrc`) : aucune banque de sons ni compte nécessaire. numpy n'est pas installé.
- **Niveaux (retour utilisateur)** : le premier jet était **trop fort, surtout le carillon**. Les réglages validés :
  - bruitages `sfx_gain` 0,30 ;
  - carillon × 0,45, avec un timbre adouci (do-sol-do, passe-bas à 4 kHz, attaque de 12 ms) ;
  - impacts × 0,7.
- **Musique** : 4 accords (Fa maj7, Sol6, La m7, Do maj7) à 90 bpm, nappe plus arpège en croches, compressée par la voix (formule OOO), volume 0,32.
- **Bug corrigé** : `sidechaincompress` arrête la musique quand la voix s'arrête. Il faut `apad=whole_dur=<total>` sur la voix.
- **Master** : `loudnorm I=-14 TP=-1.5`, suivi de `alimiter=limit=0.85`. Résultat : -13,8 LUFS, crêtes à -1,4 dBFS. Un seul `<audio id="mix">` dans `index.html`.

## 10. Contrôle qualité

1. `npx hyperframes check` : 0 erreur. Une erreur de lint désactive les audits de mise en page et de contraste, donc on la corrige avant tout.
2. `npx hyperframes snapshot --at t1,t2,… --no-end --describe false` sur les moments clés, puis relecture de la planche contact. C'est ce qui a révélé le tableau resté à l'écran, le tampon qui mordait sur un texte et la station qui débordait.
3. Sur le MP4 :
   - images figées : `freezedetect=n=0.002:d=1.5` (les tenues pendant que la voix parle sont normales ; au-delà de 3,5 s, envisager un geste) ;
   - sauts d'image : `select='gt(scene,0.35)'` ;
   - niveau : `ebur128`.
4. Transcrire le son du MP4 final sur les passages corrigés.
5. Version LinkedIn : extraire une image par scène et vérifier que le bandeau ne masque rien.

## 11. Export

- Deux masters à partir de la même composition : variable `linkedin` (booléen) qui affiche `#li-banner`. Le bandeau disparaît au début de la dernière scène pour ne pas doubler le CTA.
- Encodage OOO : `ffmpeg -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k` (12 Mo → 4 Mo).
- **Web** : site, e-mail, présentation. **LinkedIn** : lecture auto sans le son, le CTA reste visible tout le temps.

## 12. Résultats OpenClimat

- Film de 1 min 31 en 8 scènes, voix Audrey (HeyGen), 40 bruitages synthétisés, -13,8 LUFS.
- `OpenClimat-VSL-fournisseurs-web.mp4` (4,1 Mo) et `…-linkedin.mp4` (4,3 Mo), copiés sur le bureau.
- Itérations : 2 versions du script (la v1 mélangeait les cibles), 2 fournisseurs de voix, 4 prises (dont des jointures de phrases), 1 passe de niveaux audio, 2 rendus finaux.
- Reste possible : miniature centrée qui supporte le recadrage mobile ; un geste sur « déposez » (tenue de 3,7 s à 46 s) ; une v2 pour les distributeurs.

## 13. Checklist de démarrage (nouvelle vidéo)

- [ ] Cible unique, message en une phrase, destination, durée cible
- [ ] Faits sourcés uniquement (pages lues), témoignages cités à l'identique
- [ ] Script en 8 blocs validé ; accroche ≤ 3 exemples ; pas de « … » ; sigles et noms propres notés pour la prononciation
- [ ] Charte extraite (hex, polices sous licence libre, logos nettoyés)
- [ ] Storyboard (croquis), validé par l'utilisateur
- [ ] Deux essais de voix sur l'accroche, choisis à l'oreille ; vérifier le crédit HeyGen avant de générer le texte complet
- [ ] Sigles en SSML ; jamais de pause au milieu d'une phrase
- [ ] `motion.config.json` (scènes, cues, pauses, `extra_gap`, événements audio)
- [ ] build → recalage → mix → check → captures → Studio → retours → rendu ×2 → contrôle qualité → bureau
