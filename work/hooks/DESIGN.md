# DESIGN.md — Hooks (v5, 2026-08-02)

> Off-black, off-white, un seul bleu — calqué sur neverboring.app/home.

**Historique** : v1 était calquée sur `verificateur-score-geo` (bleu Majorelle, landing seule en dark). v2 a ajouté motion/icônes/particules. v3 est passée en dark-mode natif partout avec un accent or/bronze. v4 est revenue au bleu Majorelle (`#1c00fe`) et a retiré les particules pleine-largeur ("site d'astrologie"). v4.1 a retinté le fond en bleu marine/pétrole et confiné des particules aux marges du hero ; v4.2 a corrigé la latence/fiabilité de génération (§12, toujours valide, section conservée telle quelle). **v5, même journée** : refonte visuelle complète calquée sur neverboring.app/home, sur demande explicite du fondateur — off-black/off-white (jamais de noir/blanc pur) au lieu du bleu marine, Instrument Serif + Geist au lieu de Fraunces + Inter, boutons primaires neutres (le bleu redevient un accent SECONDAIRE — focus, liens, sélection, mise en valeur — jamais un fond de bouton plein), particules du hero supprimées (`EdgeParticles.tsx` retiré), nouvelle structure de landing (bandeau, nav sticky, panneau "exemple de résultat", section avant/après, carte prix "0€", FAQ en accordéon, footer avec wordmark géant). C'est la version courante ; tout ce document décrit v5 sauf mention contraire. §10-12 (responsive, flow de brief, génération Gemini) sont inchangés par cette refonte et conservés tels quels.

Ce fichier couvre le système de design partagé (`app/globals.css`, `app/layout.tsx`) ainsi que la landing page (`app/page.tsx`) et le flow de brief (`app/(app)/onboarding/page.tsx` + `components/onboarding/OnboardingWizard.tsx`, §11). Les autres pages authentifiées (dashboard, login/signup, détail de génération) héritent des mêmes tokens sans traitement spécifique — un seul système, pas de split marketing/outil.

**Important — pas de preuve sociale fabriquée** : neverboring.app/home affiche des avatars, une note 5 étoiles, "+100 utilisateurs" et de vrais témoignages nommés. Hooks n'a pas (encore) ces éléments réels, et **il ne faut jamais en fabriquer** (faux avatars, fausse note, faux témoignages, faux compteur d'utilisateurs, fausse urgence/compte à rebours) — seul le contenu vérifiable (le profil du fondateur, les vrais mécanismes du produit) sert de preuve de confiance. Si de vrais témoignages/utilisateurs existent un jour, les ajouter alors dans une section dédiée en suivant le patron visuel de neverboring (carte blanche, étoiles, citation, avatar+nom+rôle) — pas avant.

## 1. Visual Theme & Atmosphere

**Style**: Dark Editorial minimal, calqué sur neverboring.app/home. Fond quasi-noir (jamais noir pur), texte blanc cassé (jamais blanc pur), hiérarchie construite par opacité/gris plutôt que par couleur, un seul accent chromatique (bleu outremer) utilisé avec parcimonie — jamais en fond de bouton principal. Touche éditoriale via une police serif d'affichage (Instrument Serif) sur tout titre marketing.
**Keywords**: sobre, confiant, minimal, éditorial, retenu.
**Interaction Tier**: L2, sans particules (retirées en v5 — `EdgeParticles.tsx` supprimé, le site de référence n'en a pas). Signature moments : reveal fade+slide au scroll (`Reveal.tsx`), badge d'icône flat qui flotte doucement (`IconBadge.tsx`, plus de gradient 3D depuis v5), cartes "spotlight" (halo bleu au curseur), CTA magnétique, glow `.aurora` unique et discret derrière le hero, wordmark géant et très transparent en pied de page.
**Dependencies**: `motion` (le package npm `motion`, import `"motion/react"` — **pas** `framer-motion`) pour reveal/magnétisme/reduced-motion ; le reste en CSS/Tailwind pur.

## 2. Color Palette & Roles

```css
:root {
  --ink: #f0f0f0;                /* texte principal — blanc cassé, jamais pur blanc */
  --ink-secondary: #b9b9bb;      /* corps de texte secondaire, descriptions */
  --ink-muted: #8a8a8c;          /* labels, placeholders, méta-info */
  --paper: #0e0e0f;              /* fond de PAGE, partout — quasi-noir, jamais #000 pur */
  --surface: #131314;            /* cartes, inputs, tout élément "élevé" d'un cran */
  --surface-raised: #1b1b1d;     /* élévation suivante (ex. mini-cards dans une card) */
  --border: rgba(255, 255, 255, 0.1);
  --border-soft: rgba(255, 255, 255, 0.06);

  --btn-primary: #d9d9d9;        /* bouton primaire — blanc cassé, PAS le bleu */
  --btn-primary-ink: #0a0a0a;    /* texte quasi-noir sur bouton primaire */

  --accent: #1c00fe;             /* bleu outremer — unique couleur de contraste, usage SECONDAIRE */
  --accent-ink: #ffffff;
  --accent-tint: rgba(28, 0, 254, 0.14);
  --link: #6b8aff;               /* bleu clair — accent EN TANT QUE TEXTE sur fond sombre */

  --good: #34c77b;
  --warning: #e8823c;
  --critical: #e5484d;
  /* + variantes -tint à ~12% pour chaque couleur de statut */
}
```

**Color Rules:**
- `--paper`/`--surface` sont LE fond de toute l'app, partout — off-black, jamais `#000` pur.
- **Le bleu outremer est un accent SECONDAIRE, jamais la couleur dominante.** Rupture volontaire avec v1-v4.2 : avant, `--accent` remplissait les boutons primaires ; depuis v5 (calqué sur neverboring, dont le bouton primaire est blanc cassé/texte noir), le bleu n'apparaît que dans des moments ponctuels — focus ring d'input, bordure/glow de mise en valeur (carte "avec Hooks", carte prix), sélection active (choice card de l'onboarding, badge de progression), liens. Jamais comme fond de `.btn-primary`.
- **`--accent` (#1c00fe) ne doit JAMAIS être utilisé comme `text-*` directement sur `--paper`/`--surface`** — contraste WCAG ~2.2:1, sous le minimum 4.5:1. Pour tout texte/lien bleu sur fond sombre, utiliser **`--link`** (#6b8aff, contraste ~5.5:1).
- Bouton primaire = `--btn-primary` (#d9d9d9) + `--btn-primary-ink` (#0a0a0a) — jamais blanc pur ni noir pur, toujours ce couple off-white/off-black.
- Good/warning/critical restent un système fonctionnel séparé, jamais utilisé comme accent de marque.

## 3. Typography Rules

```css
/* next/font/google dans app/layout.tsx */
Instrument_Serif → --font-instrument-serif  (weight 400 uniquement, normal + italic)
Geist            → --font-geist             (weights 400, 500, 600)
```
```css
--font-sans: var(--font-geist), ...;               /* corps, UI, boutons, labels */
--font-display: var(--font-instrument-serif), ...; /* tout titre marketing/éditorial */
```

| Role | Font | Size | Weight | Notes |
|------|------|------|--------|-------|
| Hero H1 | Instrument Serif | `text-5xl sm:text-7xl` | 400 (regular, seul poids dispo) | jamais de `font-bold` sur la serif |
| Section H2 | Instrument Serif | `text-3xl sm:text-4xl` | 400 | tout titre de section, y compris dans l'app (dashboard, wizard) |
| Pricing digit ("0€") | Instrument Serif | `text-6xl` | 400 | moment display, pas juste un chiffre |
| Card title | Geist | `text-sm`/base | 600 | |
| Body | Geist | `text-base`/`text-lg` | 400 | |
| Boutons, nav, labels | Geist | `text-sm`/`text-xs` | 500/600 | |
| Eyebrow/label | Geist | `text-[11px]`/`text-xs` | 500, uppercase, tracking wide | pas de police mono dédiée |

**Typography Rules:**
- **2 polices maximum, strictement** : Instrument Serif (tout titre/moment éditorial) + Geist (tout le reste).
- Instrument Serif n'a qu'un seul poids (400/regular) — ne jamais essayer `font-bold`/`font-semibold` dessus, ça ne changera rien visuellement (le fallback système prendra le relai de façon incohérente). Utiliser la taille, pas le poids, pour la hiérarchie sur la serif.
- Ne jamais mettre la serif en dessous de `text-2xl` — c'est une police d'affichage, pas une police de labels.
- **NEVER use**: une 3e famille de police, la serif pour un label/bouton/nav, Geist au-delà du poids 600.

## 4. Component Stylings

### Bouton primaire
```css
.btn-primary {
  background: var(--btn-primary);   /* #d9d9d9, PAS --accent */
  color: var(--btn-primary-ink);    /* #0a0a0a */
  border-radius: 0.5rem;            /* rounded-lg */
  padding: 0.75rem 1.5rem;
  font-weight: 600;
}
.btn-primary:hover { filter: brightness(0.95); }
```
Rupture avec v1-v4.2 : le bouton primaire n'est plus rempli de bleu. Le bleu reste réservé aux accents secondaires (§2).

### Bouton secondaire / outline
```css
.btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--ink-secondary);
  border-radius: 0.5rem;
}
.btn-secondary:hover { border-color: rgba(28, 0, 254, 0.5); color: var(--ink); }
```

### Cartes
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 1rem; /* rounded-2xl, 16px — neverboring utilise 12-16px */
  transition: transform 150ms;
}
.card:hover { transform: translateY(-2px); }
```
Toutes les cartes de contenu portent une bordure explicite. Radius : `rounded-2xl` (16px) pour les cartes principales, `rounded-xl` (12px) pour les éléments imbriqués (mini-cards dans le panneau "exemple de résultat"), `rounded-lg` (8px) pour les boutons.

### Carte de mise en valeur (bleu)
Pattern "avant/après" et carte prix : `border-accent/40 bg-accent-tint/40` (ou `bg-surface` pour la carte prix) + `shadow-[0_0_40-50px_-15/20px_rgba(28,0,254,0.5)]` — un halo bleu doux, pas une bordure agressive. C'est le SEUL endroit où le bleu prend autant de place visuelle ; réservé aux moments "regarde ça en particulier".

### Icône plate (`.icon-tile` dans `globals.css`, remplace `.icon-badge` de v1-v4.2)
Tuile carrée arrondie (`rounded-xl`), fond `--surface-raised`, bordure `--border-soft`, icône colorée en `--link`. Plus de dégradé 3D ni de tilt à la souris (retiré en v5 — trop chargé pour ce système, neverboring reste flat). Flottement idle léger conservé (`icon-tile-float`, `components/IconBadge.tsx`).

## 5. Layout Principles

Containers `max-w-2xl`/`max-w-3xl` (hero, texte, FAQ, à propos) / `max-w-4xl`/`max-w-5xl` (grilles, comparaison) / `max-w-6xl` (nav, footer). `px-6`, sections en `py-16`/`py-20`.

**Icônes** : `lucide-react`, pictogrammes génériques par carte (jamais de vrai logo de marque LinkedIn/Meta/Google/Reddit) — `Briefcase`/`Users`/`Search`/`MessageCircle`.

## 6. Depth & Elevation

Sur fond quasi-noir, la profondeur vient de 3 leviers combinés :
1. **Bordure** (`border-border-soft`) — obligatoire sur toute carte.
2. **Élévation de surface** (`--surface` puis `--surface-raised`, différence volontairement subtile).
3. **Glow bleu** réservé aux moments de mise en valeur uniquement (carte avant/après "avec Hooks", carte prix) — jamais sur une carte ordinaire.

## 7. Animation & Interaction

**Motion Philosophy**: discret, jamais gratuit.
**Tier**: L2.
**Librairie**: `motion` (npm), import `"motion/react"` — jamais `framer-motion`.

### Composants de motion (`components/`)
- `Reveal.tsx` — fade + `translateY(16px→0)` déclenché au scroll (`whileInView`, `viewport={{ once: true }}`). **Piège de vérification** : un screenshot Playwright plein-page (`fullPage: true`) pris immédiatement après `networkidle` capture les sections encore invisibles (l'IntersectionObserver ne s'est jamais déclenché pour le contenu jamais scrollé à l'écran) — ça ressemble à un gros trou blanc dans la page alors que ce n'est qu'un artefact de test. Pour vérifier visuellement une page pleine de `Reveal`, scroller par petits pas (`window.scrollTo` + `waitForTimeout` ~500ms) et screenshoter à chaque palier, plutôt que se fier à un unique screenshot `fullPage`.
- `IconBadge.tsx` — voir §4, flat depuis v5.
- `SpotlightCard.tsx` — halo `radial-gradient` bleu (`rgba(28,0,254,0.1)`) qui suit le curseur, throttlé par `requestAnimationFrame`.
- `MagneticLink.tsx` — CTA qui suit légèrement le curseur (spring), désactivé sous reduced-motion.
- `.aurora` (CSS pur) — UN SEUL glow radial bleu, discret, en fond de hero, dérive lente en boucle. Réduit depuis v4.1 (qui avait 3 blobs superposés) — neverboring garde son glow de hero très subtil, pas un effet dominant.
- `.footer-wordmark` (CSS pur, nouveau v5) — le mot "Hooks" en Instrument Serif, `clamp(4rem, 16vw, 11rem)`, `opacity: 0.06`, qui déborde en bas du footer. Signature directe de neverboring.app/home.

Photo du fondateur : `public/founder.jpeg` (vraie photo, fournie explicitement par le fondateur).

**Supprimé en v5** : `EdgeParticles.tsx` (particules de bords du hero, introduites en v4.1) — le site de référence n'a aucun effet de particules, et le système visuel v5 est plus minimal. Ne pas réintroduire de particules sans nouvelle demande explicite.

### Reduced Motion
Chaque composant de motion respecte `prefers-reduced-motion` individuellement.

## 8. Landing page — structure (calquée sur neverboring.app/home)

`app/page.tsx`, dans l'ordre :
1. **Bandeau d'annonce** — info réelle uniquement ("100% gratuit — 10 crédits offerts chaque jour, sans carte bancaire"), jamais de fausse urgence/compte à rebours/code promo (neverboring a un vrai bandeau de lancement à durée limitée ; Hooks n'a pas d'offre équivalente, donc pas de fausse urgence fabriquée).
2. **Nav sticky** (`bg-paper/80 backdrop-blur-md`) — logo serif à gauche, ancres de section au centre (`#fonctionnalites`, `#pourquoi`, `#faq`), "Se connecter" + bouton primaire "Essayer" à droite.
3. **Hero** — badge pill, H1 serif 2 lignes, sous-titre 2 phrases, double CTA (primaire plein + secondaire outline vers `#fonctionnalites`), micro-caption, puis un **panneau "Exemple de résultat"** avec 2 vraies mini-cards au format `GenerationResultView` (contenu réel/représentatif, jamais un faux témoignage utilisateur).
4. **Fonctionnalités** (`#fonctionnalites`) — grille 2 colonnes de `FEATURES`, icône plate + titre + description.
5. **Régies supportées** — grille 4 colonnes, une carte par régie.
6. **Avant/Après** — 2 colonnes, "Sans Hooks" (croix, gris) vs "Avec Hooks" (coche, bordure+glow bleu) — comparaison honnête de proposition de valeur, pas des citations utilisateur fabriquées.
7. **Pourquoi Hooks** (`#pourquoi`) — carte crédibilité fondateur (photo réelle, parcours, credentials) — inchangée dans le fond depuis v4, restylée.
8. **Carte prix "0€"** — carte unique mise en valeur (bordure+glow bleu), grand chiffre serif, checklist, CTA. Pas de tableau à 3 tiers : Hooks est 100% gratuit, une seule offre.
9. **FAQ** (`#faq`) — accordéon natif `<details>/<summary>` (pas de JS custom nécessaire), questions réelles sur le produit.
10. **CTA final**.
11. **Footer** — logo+tagline, colonnes de liens (Produit/Compte), copyright + lien LinkedIn fondateur, puis `.footer-wordmark` géant.

**Ce qui n'a délibérément PAS été copié de neverboring** (voir l'avertissement en tête de fichier) : avatars/étoiles/compteur d'utilisateurs, témoignages nommés, bandeau de compte à rebours/code promo, tableau de comparaison à 3 tiers de prix, le diagramme de flux multi-agents (spécifique à leur produit, ne correspond pas à l'architecture réelle de Hooks — un seul appel Gemini, pas une orchestration multi-agents visible).

## 9. Do's and Don'ts

### Do
- Garder `--paper`/`--surface` comme fond de TOUTE l'app — off-black, jamais `#000` pur (§2).
- Toujours mettre une bordure (`border-border-soft`) sur les cartes.
- Réserver le bleu à des usages SECONDAIRES (focus, lien, sélection, mise en valeur ponctuelle) — le bouton primaire reste `--btn-primary` (off-white/off-black), jamais bleu (§2, §4).
- Respecter `prefers-reduced-motion` sur CHAQUE composant de motion individuellement.
- Garder Instrument Serif réservée aux titres/moments éditoriaux, jamais en dessous de `text-2xl` (§3).
- Vérifier une page pleine de `Reveal` par scroll incrémental, pas par un screenshot `fullPage` unique (§7).
- Si de vrais témoignages/utilisateurs existent un jour, les ajouter en suivant le patron visuel de neverboring — jamais en fabriquer avant (voir avertissement en tête de fichier).

### Don't
- ❌ Ne pas remplir un bouton primaire de bleu — c'était la règle v1-v4.2, elle est inversée en v5 (§2, §4).
- ❌ Ne pas utiliser `--accent` (#1c00fe) comme couleur de texte sur `--paper`/`--surface` — contraste WCAG ~2.2:1, illisible. Utiliser `--link`.
- ❌ Ne pas ajouter de 3e couleur de marque ni de 3e police.
- ❌ Ne pas mettre `font-bold`/`font-semibold` sur Instrument Serif — un seul poids existe (400).
- ❌ Ne pas utiliser `framer-motion` — le package s'appelle `motion`, import `"motion/react"`.
- ❌ Ne pas ajouter de scroll-jacking (Lenis), de pin GSAP, ni de vraie scène WebGL.
- ❌ Ne pas réintroduire de particules (`EdgeParticles.tsx`, supprimé en v5) sans nouvelle demande explicite.
- ❌ Ne jamais fabriquer de fausse preuve sociale (avatars, notes, témoignages, compteurs d'utilisateurs, urgence/compte à rebours) — voir l'avertissement en tête de fichier.
- ❌ Ne pas remettre "6 candidats" / "80/100" ou tout détail mécanique interne dans le copy marketing.
- ❌ Ne pas remettre de tableau de tarifs à plusieurs tiers — produit 100% gratuit, une seule carte prix (§8).
- ❌ Ne pas oublier `break-words` sur tout label de carte contenant une barre oblique sans espace (ex. "Facebook/Instagram").

## 10. Responsive Behavior

Breakpoints Tailwind par défaut. Vérifié par Playwright en desktop (1440px) et mobile (390px) sur la landing (hero + scroll complet) et l'app (login, dashboard, wizard) — aucun débordement horizontal observé.

## 11. Le flow de brief (`app/(app)/onboarding/page.tsx` + `components/onboarding/OnboardingWizard.tsx`)

**Architecture** : `page.tsx` est un Server Component qui charge le profil (`profiles.first_name`, `.brand_name`, `.default_brief`) et le passe en props à `OnboardingWizard` (Client Component) — pattern nécessaire pour préremplir le formulaire sans flash de contenu vide.

**15 étapes**, une question à la fois façon Typeform/Cal.com :
1. **Profil** (prénom + marque, deux champs sur un seul écran, skippable) — sauvegardé après chaque génération réussie, préremplit les visites suivantes.
2. Régie, format, budget, funnel (cartes à choix, sélection = avance automatiquement).
3. **Catégorie "Mon produit"** (4 champs) : industrie, produit/offre, fonctionnalités clés, preuves de crédibilité.
4. **Catégorie "Ma cible"** (3 champs) : persona, rêves/objectifs, douleurs & objections.
5. **Catégorie "Concurrence"** (2 champs) : ce que les concurrents apportent, ce qu'ils n'ont pas.
6. Visuel (optionnel) + bouton de soumission.

Les 9 champs texte sont pilotés par un seul tableau `TEXT_FIELDS` (id/catégorie/question/placeholder) et un objet d'état `Record<TextFieldId, string>` plutôt que 9 `useState` séparés. Les H1 de chaque étape sont en Instrument Serif depuis v5 (`font-display text-3xl sm:text-4xl font-normal`), cohérent avec le traitement des titres de section sur la landing.

**Préremplissage** : au montage, tout le state (platform/format/budget/funnel + les 9 champs texte) est initialisé depuis `defaultBrief` (prop serveur) si présent. Après chaque génération réussie, `/api/generate` fait un `UPDATE profiles SET default_brief = ...` best-effort. Le visuel n'est **jamais** persisté dans `default_brief`.

**Transitions** : `AnimatePresence` sans `mode="wait"` (chevauchement fluide), chaque étape en `position: absolute inset-0` dans un conteneur `relative`. Durée 0.25s.

## 12. Format de sortie, génération Gemini — inchangé par la refonte v5

Depuis le pivot v4, chaque génération renvoie `{ cards: HookCard[] }` où `HookCard = { title, description?, cta? }` — **1 hook = 1 card**, jamais de score numérique affiché (`components/GenerationResultView.tsx`). Jusqu'à 5 cards par génération (`MAX_CARDS` dans `lib/gemini/generate-hooks.ts`), conformité aux limites de caractères vérifiée en code (pas seulement dans le prompt) avec fallback sur le pool brut si aucune card ne respecte les limites.

### Piège rencontré et corrigé en v4.1 : des titres, pas des hooks

Premier jet du switch Gemini : les `title` générés étaient corrects en caractères mais structurés comme des titres d'article — deux phrases collées par un point. Trois corrections combinées, dans `lib/gemini/generate-hooks.ts` et `lib/ad-platforms.ts` :

1. **`titleMaxChars` resserré délibérément en dessous de la vraie limite de troncature de chaque régie** (LinkedIn 150→90, Meta 125→70/carousel 80→60, Reddit 100→70 ; Google RSA reste à 30).
2. **Règle explicite en tête du system prompt** ("RÈGLE ABSOLUE SUR LE title") avec exemples few-shot bon/mauvais.
3. **Filtre de conformité étendu en code** (`isCompoundSentence()`) : détecte un `.`/`!`/`?` suivi d'un espace puis d'une majuscule ailleurs qu'en toute fin de chaîne, et rejette la card du pool "compliant".

Résultat mesuré sur le même brief avant/après : titres passés de 89-122 caractères à 54-68 caractères. **Si ce problème réapparaît**, vérifier ces trois leviers dans l'ordre.

### v4.2 : latence et fiabilité de la génération

**Cause racine : `gemini-3.5-flash` n'est pas viable sur le tier gratuit.** Deux symptômes distincts, tous deux liés au modèle plutôt qu'au code applicatif :
- Un plafond dur de **20 requêtes/jour** pour tout le projet (`generativelanguage.googleapis.com/generate_content_free_tier_requests`, quota `GenerateRequestsPerDayPerProjectPerModel-FreeTier`) — au-delà, chaque appel échoue en 429 `RESOURCE_EXHAUSTED`, pour tous les users confondus.
- Une boucle de répétition dégénérée occasionnelle (mesuré ~1 appel sur 6-9, indépendamment du thinking budget) : un champ répète la même phrase des centaines de fois, consomme tout le `maxOutputTokens` avant de finir le JSON, et tronque la réponse en plein milieu d'une string (`SyntaxError: Unterminated string`).

**Fix principal : migration vers `MODEL = "gemini-3.1-flash-lite"`** (`lib/gemini/generate-hooks.ts`). Testé sur le schéma JSON, le prompt système et l'input vision exacts de ce projet : 8/8 appels réussis en rafale, ~1.2-1.7s par appel (contre ~6-9s, voire 429 en rafale, sur flash). Pas de plafond quotidien dur — seulement un quota par minute qui se régénère en quelques minutes. Voir [[ai-provider-policy-external-tools]] : ce choix de modèle doit être re-vérifié empiriquement s'il recommence à échouer, pas supposé stable dans le temps.

Mitigations défensives conservées en plus du changement de modèle (`lib/gemini/generate-hooks.ts`) :
1. **`thinkingConfig.thinkingBudget` fixé à 512** au lieu de `-1` (automatique) — mesuré légèrement plus rapide et sans effet négatif observé sur flash-lite.
2. **`maxOutputTokens` réduit de 4096 à 2000** — une réponse normale tient dans ~300-400 tokens ; si une boucle de répétition se reproduisait, elle tronquerait plus vite.
3. **Retry applicatif** (`callGemini()`, `MAX_ATTEMPTS = 2`), avec **court-circuit sur 429** : une erreur de quota échouera identiquement au 2e essai, donc pas la peine de brûler une 2e requête (et de la latence) dessus — `err.status === 429` sort de la boucle immédiatement.

`app/api/generate/route.ts` parallélise aussi (via `Promise.all`) l'insert du brief avec le claim du slot de génération, et l'insert de la génération avec l'update du profil — ces paires d'écritures Supabase ne dépendent pas l'une de l'autre. Point de correction associé : si l'insert du brief échoue mais que le claim du slot a réussi (les deux tournent en parallèle), le slot est libéré via `release_generation_slot` avant de renvoyer l'erreur, pour ne jamais consommer un crédit sur un échec.

Résultat mesuré end-to-end (4 appels réels via `/api/generate`, DB writes comprises) : 4/4 succès, 4.9s en moyenne (1.9-7.9s) — contre un taux d'échec de 25-75% et ~9.5-12.4s de moyenne avant ce fix.
