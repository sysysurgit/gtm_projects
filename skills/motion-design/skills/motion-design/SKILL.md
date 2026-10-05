---
name: motion-design
description: Produire une VSL ou une vidéo promo en motion design (HTML/GSAP rendu en MP4 avec HyperFrames) selon la méthode Agence OOO éprouvée sur la VSL OpenClimat. Couvre le script en 8 blocs, le storyboard, la voix de synthèse (HeyGen) avec prononciation vérifiée, les animations déclenchées sur les mots, le recalage voix → scènes, le sound design synthétisé, le contrôle qualité et l'export web + LinkedIn. À utiliser pour « fais une vidéo motion design », « une VSL pour <site> », « refais la même chose pour <client> » ou /motion-design.
---

# /motion-design : VSL en motion design avec Claude

Avant tout, lire `references/playbook.md` (dans le dossier de ce skill). Il contient l'origine de la méthode, le squelette en 10 étapes, chaque difficulté rencontrée sur la VSL OpenClimat et sa solution. La configuration complète de ce projet sert d'exemple : `templates/motion.config.example.json`.

Ce skill **orchestre**. Le contrat de composition reste celui des skills HyperFrames : charger `/hyperframes` (puis `/general-video` en `flow: companion`, `storyboard: yes`), et `/hyperframes-core` avant d'écrire du HTML. S'ils manquent : `npx hyperframes skills update general-video`.

## Outils (dossier de ce skill)

| Fichier | Rôle |
|---|---|
| `scripts/heygen_tts.py` | Voix HeyGen + timestamps mot à mot, sans transcription. Option `--ssml` pour les sigles. |
| `scripts/build_timeline.py <projet> <voix> <words.json>` | Insère les silences, écrit `audio/voice.wav` et `audio/timeline.json`, injecte `/*CUES*/` dans les scènes et les bornes dans `index.html` |
| `scripts/build_audio.py <projet>` | Bruitages synthétisés + musique + sidechain OOO + -14 LUFS → `audio/mix.wav` |
| `scripts/splice_block.py` | Remplace une phrase ou un bloc dans une prise (corriger un mot sans tout régénérer ni consommer de crédit) |
| `templates/scene.html` | Squelette de sous-composition : cues, entrée à droite, sortie à gauche, sélecteurs limités à la scène |
| `templates/index.html` | Hôtes `h-<scene>`, `<audio id="mix">`, bandeau `#li-banner` piloté par la variable `linkedin` |
| `templates/motion.config.example.json` | Configuration complète d'OpenClimat (8 scènes, cues, pauses, `extra_gap`, 33 événements audio) |

Prérequis : Node, ffmpeg, Google Chrome, Python 3 (sans dépendance), le CLI HeyGen. ImageMagick est optionnel (nettoyage des logos).

## Déroulé (une validation de l'utilisateur à chaque ★)

1. **Intention** : cible unique (ne jamais mélanger deux audiences), message, durée (~90 s), destination. Demander le contexte (client, prospection, démo) : il détermine ce qu'on peut affirmer.
2. **Recherche** : lire les pages du site (WebFetch), relever les faits publics, les chiffres, les témoignages exacts, les CTA. Extraire la charte du CSS (couleurs hex, polices) et les logos (nettoyage : playbook § 5).
3. **★ Script en 8 blocs** dans `SCRIPT.md` : ton parlé, accroche de 3 exemples au plus, pas de « … », CTA court et promotionnel. Lister les sigles et noms propres à risque de prononciation.
4. **★ Storyboard** : `STORYBOARD.md` (blueprints cités, fil rouge, transitions, tenues) + `storyboard.html` (croquis, autonome, < 512 Ko pour un panneau d'aperçu).
5. **★ Voix** : `heygen auth status`. Si l'utilisateur n'est pas connecté, il installe le CLI (`curl -fsSL https://static.heygen.ai/cli/install.sh | bash`) et lance lui-même `heygen auth login --oauth` (ne jamais saisir d'identifiants). Générer l'accroche avec 2 voix, les copier sur le bureau et fournir une page de lecteurs. Vérifier le crédit (~2 min gratuites par mois) avant le texte complet. Sigles en SSML `<say-as interpret-as="characters">`. Noms écrits comme ils se prononcent (« Seb », « Open Climat »).
6. **Contrôle de prononciation** : `npx hyperframes transcribe <wav> -m medium -l fr`. **Transcrire en contexte**, jamais une phrase isolée seulement. Un mot faux : régénérer la phrase seule et la recoller avec `splice_block.py`.
7. **Build** : `npx hyperframes init <projet> --non-interactive --example=blank --skill=general-video`, `BRIEF.md`, une scène par bloc depuis `templates/scene.html`, `motion.config.json` depuis l'exemple. Animer en `x`/`y`/`scale`/`opacity` seulement.
8. **Recalage et mix** : `build_timeline.py`, puis `build_audio.py`. Pauses uniquement en début de phrase. Tenue après une punchline via `extra_gap`. Bruitages bas par défaut (`sfx_gain` 0,30, carillon × 0,45), proposer d'augmenter plutôt que l'inverse.
9. **Contrôle** : `npx hyperframes check` (0 erreur), captures aux moments clés (`snapshot --at … --no-end --describe false`) et lecture de la planche contact.
10. **★ Studio** : `npx hyperframes preview --background`, ouvrir l'URL du Studio, recueillir les retours, itérer (relancer recalage et mix).
11. **★ Rendu** (seulement après accord) : deux masters (`-q delivery`, puis `--variables '{"linkedin":true}'`), encodage OOO (`libx264 -preset slow -crf 24 -movflags +faststart`, AAC 128k), contrôle qualité du MP4 (freezedetect, scene, ebur128, transcription des passages corrigés, images du bandeau), livraison.

## Garde-fous

- Seulement des faits publics et sourcés. Citations à l'identique, avec nom et fonction. Pas de logo qui tourne, pas d'emoji comme métaphore, pas de fausse UI présentée comme le produit.
- Les clés ElevenLabs commencent par `sk_`. Un *key ID* est refusé. Ne jamais écrire une clé ailleurs que dans un `.env` ignoré par git.
- Le Studio HyperFrames réécrit les fichiers (`data-hf-id`) : relire avant d'éditer. Les outils tolèrent l'ordre des attributs.
- Ne jamais lancer le rendu sans l'accord explicite de l'utilisateur après l'aperçu Studio.
