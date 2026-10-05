# motion-design : un skill Claude Code pour les vidéos en motion design

Le skill fait produire à Claude Code une **VSL** (vidéo de vente) ou une vidéo promo en motion design, du script au MP4. Les scènes sont écrites en HTML/GSAP, puis rendues avec [HyperFrames](https://hyperframes.heygen.com). La voix est générée par HeyGen, et chaque animation se déclenche sur un mot précis de la voix off.

## Exemple de rendu final

**[▶ Voir la vidéo : VSL OpenClimat, cible fournisseurs, version LinkedIn (1 min 31)](00-EXEMPLE-RENDU-FINAL-MOTION-DESIGN/OpenClimat-VSL-fournisseurs-linkedin.mp4)**

[![Aperçu de l'accroche de la VSL OpenClimat](00-EXEMPLE-RENDU-FINAL-MOTION-DESIGN/apercu-accroche.gif)](00-EXEMPLE-RENDU-FINAL-MOTION-DESIGN/OpenClimat-VSL-fournisseurs-linkedin.mp4)

Cette vidéo d'exemple a été produite avec ce skill pour [openclimat.com](https://www.openclimat.com), à partir des seules informations publiques du site :
- 8 scènes, chacune calée au mot près sur la voix ;
- voix de synthèse HeyGen ;
- 40 bruitages et une musique synthétisés avec ffmpeg, mix à -14 LUFS ;
- un bandeau CTA LinkedIn fixe en verre dépoli.

Les fichiers sont dans [`00-EXEMPLE-RENDU-FINAL-MOTION-DESIGN/`](00-EXEMPLE-RENDU-FINAL-MOTION-DESIGN).

## Installer

Dans Claude Code :

```
/plugin marketplace add sysysurgit/gtm_projects
/plugin install motion-design@sysysurgit
```

Ou à la main : copier le dossier `skills/motion-design/skills/motion-design/` dans `~/.claude/skills/motion-design/`.

Ensuite, il suffit de demander « fais une VSL en motion design pour <site> », ou de taper `/motion-design`.

### Prérequis

- [Claude Code](https://claude.com/claude-code), avec les skills HyperFrames : `npx hyperframes skills update general-video`
- Node, ffmpeg, Google Chrome, Python 3 (sans dépendance)
- Le CLI HeyGen pour la voix : `curl -fsSL https://static.heygen.ai/cli/install.sh | bash`, puis `heygen auth login --oauth` (environ 2 min de voix gratuites par mois)
- ImageMagick (optionnel, pour nettoyer les logos)

## Contenu

| Chemin | Rôle |
|---|---|
| `skills/motion-design/SKILL.md` | Le déroulé en 11 étapes, avec une validation de l'utilisateur aux étapes clés |
| `skills/motion-design/references/playbook.md` | Le playbook complet : méthode, toutes les difficultés rencontrées (voix, prononciation, lint, sound design…) et leurs solutions |
| `skills/motion-design/scripts/` | `heygen_tts.py`, `build_timeline.py` (recalage voix → scènes), `build_audio.py` (sound design et mix), `splice_block.py` (corriger un mot) |
| `skills/motion-design/templates/` | Gabarit de scène, `index.html` avec bandeau LinkedIn, configuration complète d'OpenClimat comme exemple |

## Crédits

La méthode s'appuie sur le guide gratuit d'Agence OOO : [Créer une VSL en motion design avec Claude](https://saas-ooo.vercel.app/lm/vsl-motion-design) (script en 8 blocs, déclenchement sur les mots, sound design, recalage temporel, exports). Le rendu repose sur [HyperFrames](https://hyperframes.heygen.com) de HeyGen.
