# DESIGN.md — Hooks (v4.1, 2026-08-02)

> Un bleu pétrole, un seul accent — le bleu Majorelle qui souligne ce qui accroche vraiment.

**Historique** : v1 était calquée sur `verificateur-score-geo` (bleu Majorelle, plan de couleur continu sur la landing uniquement, reste de l'app en clair). v2 a ajouté motion/icônes/particules mais gardé le bleu. v3 (même journée, 2026-08-02) est passée en dark-mode natif partout avec un accent **or/bronze** à la place du bleu. v4 revient au bleu Majorelle (`#1c00fe`, texte blanc dessus) sur retour explicite du fondateur, et retire les particules du hero ("on dirait un site d'astrologie"). **v4.1, encore la même journée** : fond passé de noir pur à un bleu marine/pétrole (`--paper`/`--surface` retintés, voir §2), contraste texte-sur-accent corrigé via un nouveau token `--link` (§2), particules réintroduites mais confinées aux marges gauche/droite du hero uniquement — sans lignes de connexion (§7), et surtout : le prompt de génération corrigé pour produire de vrais hooks courts au lieu de titres composés de deux phrases (§12). C'est la version courante ; tout ce document décrit v4.1 sauf mention contraire.

Ce fichier couvre le système de design partagé (`app/globals.css`, `app/layout.tsx`) ainsi que la landing page (`app/page.tsx`) et le flow de brief (`app/(app)/onboarding/page.tsx` + `components/onboarding/OnboardingWizard.tsx`, §8). Les autres pages authentifiées (dashboard, login/signup) héritent des mêmes tokens sans traitement spécifique — un seul système, pas de split marketing/outil.

**Pivot produit (2026-08-02)** : Hooks est redevenu un outil 100% gratuit (comme `verificateur-score-geo`), pas un SaaS payant — voir README.md et `supabase/migrations/0003_free_pivot.sql`. Ça n'affecte pas ce fichier de design directement, mais explique pourquoi il n'y a plus de section tarifs sur la landing (§9 Don't).

## 1. Visual Theme & Atmosphere

**Style**: Dark Editorial. Structurellement inspiré de systèmes comme Linear (canvas quasi-noir, hiérarchie construite par opacité de blanc plutôt que par couleur, un seul accent chromatique utilisé avec parcimonie) — accent bleu Majorelle (cohérence avec `verificateur-score-geo`), touche éditoriale via une police serif d'affichage pour le H1 et la citation "auto-analyse".
**Keywords**: sobre, confiant, précis, chaleureux malgré le noir, éditorial.
**Interaction Tier**: L2, mais **sans particules** (retirées en v4 — jugées trop proches d'un site "cosmos/astrologie" sur fond noir). Signature moments restants : reveal fade+slide du H1 (un seul bloc, pas mot-par-mot — voir §8 pour pourquoi), badges d'icônes pseudo-3D (tilt souris + flottement idle), cartes "spotlight" (halo au curseur), CTA magnétique, glow `.aurora` en CSS pur derrière le hero. Plafond volontaire sous L3 : pas de scroll-jacking, pas de scène WebGL/3D réelle, pas de pin GSAP.
**Dependencies**: `motion` (le package npm `motion`, import `"motion/react"` — **pas** `framer-motion`) pour reveal/magnétisme/reduced-motion ; le reste en CSS/Tailwind pur.

## 2. Color Palette & Roles

```css
:root {
  /* Neutres teintés froid/bleu (pas chauds) pour matcher la sous-teinte
     marine de --paper — des gris de la même famille de teinte lisent plus
     contrastés et cohérents que des gris chauds posés sur un fond bleu. */
  --ink: #f0f2f7;                /* texte principal — blanc cassé froid, jamais pur blanc */
  --ink-secondary: #a8b0c4;      /* corps de texte secondaire, descriptions */
  --ink-muted: #6b7390;          /* labels, placeholders, méta-info */
  --paper: #0a0f1c;              /* fond de PAGE, partout — bleu marine/pétrole, pas noir pur */
  --surface: #131a2c;            /* cartes, inputs, tout élément "élevé" d'un cran */
  --border: rgba(255, 255, 255, 0.14);      /* bordure visible par défaut */
  --border-soft: rgba(255, 255, 255, 0.08); /* bordure la plus discrète */
  --accent: #1c00fe;             /* bleu Majorelle — seul accent chromatique de marque */
  --accent-ink: #ffffff;         /* texte/icônes SUR l'accent (blanc — le bleu est saturé et sombre) */
  --accent-tint: rgba(28, 0, 254, 0.14);
  --link: #6b8aff;               /* bleu clair — accent EN TANT QUE TEXTE sur fond sombre (voir règle ci-dessous) */
  --good: #34c77b;
  --warning: #e8823c;
  --critical: #e5484d;
  /* + variantes -tint à ~12% pour chaque couleur de statut */
}
```

**Color Rules:**
- `--paper`/`--surface` sont LE fond de toute l'app, pas seulement de la landing — aucune page ne repasse en clair.
- **`--accent` (#1c00fe) ne doit JAMAIS être utilisé comme `text-*` directement sur `--paper`/`--surface`** — contraste WCAG mesuré à ~2.2:1, très en dessous du minimum 4.5:1 (piège réel rencontré : les CTA "Comparer notre méthode →" dans les cards de résultats étaient illisibles). `--accent` ne sert que comme fond de bouton/badge plein (avec `--accent-ink` blanc dessus, contraste ~8.5:1, très bon) ou comme couleur de bordure/icône décorative. **Pour tout texte ou lien bleu sur fond sombre, utiliser `--link` (#6b8aff, contraste ~5.5:1)**, jamais `--accent`.
- Hiérarchie construite par opacité de `--ink` (`text-ink/70`, `/80`, etc.) plutôt que par de nouvelles couleurs, à la Linear.
- Good/warning/critical restent un système fonctionnel séparé, jamais utilisé comme accent de marque.

## 3. Typography Rules

```css
/* next/font/google dans app/layout.tsx */
Fraunces  → --font-fraunces  (weights 600, 700, + italic)
Inter     → --font-inter     (weights 400, 500, 600, 700)
```
```css
--font-sans: var(--font-inter), ...;      /* corps, UI, boutons, labels techniques */
--font-display: var(--font-fraunces), ...; /* UNIQUEMENT hero H1 + la citation "auto-analyse" */
```

| Role | Font | Size | Weight | Notes |
|------|------|------|--------|-------|
| Hero H1 | Fraunces | `text-4xl sm:text-7xl` | 700 | seul élément en serif géant du site |
| Pull-quote (carte "auto-analyse") | Fraunces | `text-2xl sm:text-3xl` | 600, italic | citation, pas un titre structurel |
| Section H2 | Inter | `text-2xl sm:text-3xl` | 700 | reste en sans |
| Card title | Inter | `text-sm`/base | 600 | |
| Body | Inter | `text-base`/`text-lg` | 400/500 | |
| Eyebrow/label | Inter | `text-[11px]`/`text-xs` | 500, uppercase, tracking wide | pas de police mono dédiée |

**Typography Rules:**
- **2 polices maximum, strictement** : Fraunces (2 usages précis) + Inter (tout le reste).
- Ne jamais mettre la serif en dessous de `text-2xl`.
- **NEVER use**: une 3e famille de police, la serif pour un label ou un bouton, un poids Fraunces > 700.

## 4. Component Stylings

### Bouton primaire
```css
.btn-primary {
  background: var(--accent);
  color: var(--accent-ink); /* blanc */
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  box-shadow: 0 12px 30px -8px rgba(28, 0, 254, 0.45); /* halo bleu, pas d'ombre neutre */
}
.btn-primary:hover { filter: brightness(0.95); } /* on ASSOMBRIT au hover (accent saturé/sombre) — inverse de v3 où l'accent clair s'éclaircissait */
```

### Cartes
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 0.5rem;
  transition: transform 150ms;
}
.card:hover { transform: translateY(-2px); }
```
Toutes les cartes de contenu portent une bordure explicite (`border border-border-soft`) — sur fond quasi-noir, une carte à peine plus claire SANS bordure ne se détache pas assez.

### Badge icône 3D (`.icon-badge` dans `globals.css`)
Dégradé bleu (`#4a35ff → #1c00fe → #1200b8`, 150deg), ombres superposées (highlight interne haut, ombre interne bas, glow externe bleu), icône intérieure en `--accent-ink` (blanc). Tilt 3D à la souris + flottement idle (`components/IconBadge.tsx`).

## 5. Layout Principles

Containers `max-w-3xl` (hero, texte, à propos) / `max-w-4xl` (grilles), `px-6`, sections en `py-16`/`py-20`.

**Icônes** : `lucide-react`, pictogrammes génériques par carte (jamais de vrai logo de marque LinkedIn/Meta/Google/Reddit) — `Briefcase`/`Users`/`Search`/`MessageCircle`.

## 6. Depth & Elevation

Sur fond quasi-noir, la profondeur vient de 3 leviers combinés :
1. **Bordure** (`border-border-soft`) — obligatoire sur toute carte.
2. **Élévation de surface** (`--surface` légèrement plus clair que `--paper`, différence volontairement subtile, Linear-style).
3. **Glow coloré** sur les éléments accent uniquement (boutons, badge icône) — `box-shadow` teinté bleu, jamais de glow neutre/gris.

## 7. Animation & Interaction

**Motion Philosophy**: discret, jamais gratuit.
**Tier**: L2.
**Librairie**: `motion` (npm), import `"motion/react"` — jamais `framer-motion`.

### Composants de motion (`components/`)
- `Reveal.tsx` — fade + `translateY(16px→0)` en un seul bloc (pas de reveal mot-par-mot, voir §8 — `AnimatedHeadline.tsx` a été supprimé en v4).
- `IconBadge.tsx` — voir §4. Prend l'icône déjà rendue en `children` (contrainte Server→Client Component).
- `SpotlightCard.tsx` — halo `radial-gradient` teinté bleu (`rgba(28,0,254,0.14)`) qui suit le curseur, throttlé par `requestAnimationFrame`.
- `MagneticLink.tsx` — CTA qui suit légèrement le curseur (spring), désactivé sous reduced-motion.
- `.aurora` (CSS pur) — glows radiaux **bleus** en fond de hero, dérive lente en boucle.
- `EdgeParticles.tsx` (v4.1, remplace l'ancien `ParticleField.tsx` supprimé en v4) — poussière flottante (dérive verticale lente, pas de lignes de connexion), **confinée à deux colonnes étroites (`w-40`) sur les bords gauche/droite du hero uniquement** (`hidden lg:block` — pas de gutter sur mobile/tablette). La V4 avait retiré les particules parce qu'un champ de points-reliés-par-des-lignes couvrant tout le hero ressemblait à une carte du ciel/site d'astrologie ; les confiner en périphérie, sans lignes, résout le problème tout en gardant un peu de mouvement ambiant — ne jamais les faire couvrir la zone de texte centrale ni leur remettre des lignes de connexion.

Photo du fondateur : `public/founder.jpeg` (vraie photo, fournie explicitement par le fondateur — l'avatar anonymisé `FounderAvatar.tsx` de v3/v4 a été retiré, ce n'est plus le choix produit).

### Reduced Motion
Chaque composant de motion respecte `prefers-reduced-motion` individuellement.

## 8. Hero H1 — règle des 2 lignes (et pourquoi PAS de reveal mot-par-mot)

Le H1 est écrit en 2 `<span className="block">` fixes à l'intérieur d'un seul `<Reveal>` (fade+slide atomique, pas de stagger par mot) :
```jsx
<Reveal delay={0.08}>
  <h1 className="... font-display text-4xl sm:text-7xl font-bold ...">
    <span className="block whitespace-normal min-[375px]:whitespace-nowrap">Des hooks qui gagnent</span>
    <span className="block whitespace-normal min-[375px]:whitespace-nowrap">avant de coûter cher.</span>
  </h1>
</Reveal>
```
`whitespace-nowrap` à partir de 375px tient sans débordement (vérifié Playwright) ; en dessous, fallback en wrap.

**Piège trouvé et corrigé en v4** : une v3 antérieure utilisait `AnimatedHeadline.tsx`, un reveal mot-par-mot avec masque + `translateY` par mot. Capturé en plein milieu de l'animation (~150-300ms après chargement), ça affichait certains mots complets et d'autres à moitié montés, ce qui pouvait ressembler à du texte mal orthographié/coupé — remonté par le fondateur comme "fautes d'orthographe" alors que c'était un artefact d'animation, pas une vraie faute. Reproduit et confirmé via Playwright (screenshot à 150ms après `domcontentloaded`). **Ne jamais réintroduire de reveal mot-par-mot ou lettre-par-lettre sur le H1** — le risque qu'un visiteur voie un état intermédiaire au premier chargement est réel et le coût (image de marque, lisibilité) dépasse largement le bénéfice esthétique. Un fade+slide en un seul bloc n'a pas ce problème : quel que soit le moment où on le capture, le texte est soit invisible, soit entièrement lisible à une opacité intermédiaire — jamais partiellement décomposé.

## 9. Do's and Don'ts

### Do
- Garder `--paper`/`--surface` comme fond de TOUTE l'app (landing + authentifié) — bleu marine/pétrole, pas noir pur (v4.1).
- Toujours mettre une bordure (`border-border-soft`) sur les cartes.
- Réserver le bleu `--accent` aux fonds de bouton/badge pleins (avec `--accent-ink` blanc dessus) — pour du texte/lien bleu sur fond sombre, toujours `--link` (§2).
- Respecter `prefers-reduced-motion` sur CHAQUE composant de motion individuellement.
- Garder la serif Fraunces à seulement 2 endroits (H1 hero, citation "auto-analyse" — sans guillemets, voir §1 pull-quote).
- Faire des reveals de texte en UN SEUL bloc (fade+slide), jamais mot-par-mot ou lettre-par-lettre (§8).
- Si des particules sont utilisées, les confiner à des marges étroites hors de la zone de texte, sans lignes de connexion (§7, `EdgeParticles.tsx`).

### Don't
- ❌ Ne pas utiliser `--accent` (#1c00fe) comme couleur de texte sur `--paper`/`--surface` — contraste WCAG ~2.2:1, illisible. Utiliser `--link`.
- ❌ Ne pas faire couvrir aux particules toute la largeur du hero ni leur remettre des lignes de connexion — "ressemble à un site d'astrologie" (retour fondateur, 2026-08-02) ; les garder confinées aux marges (§7).
- ❌ Ne pas ajouter de 3e couleur de marque ni de 3e police.
- ❌ Ne pas dépasser un poids de police 700 (Fraunces).
- ❌ Ne pas utiliser `framer-motion` — le package s'appelle `motion`, import `"motion/react"`.
- ❌ Ne pas ajouter de scroll-jacking (Lenis), de pin GSAP, ni de vraie scène WebGL.
- ❌ Ne pas remettre "6 candidats" / "80/100" ou tout détail mécanique interne dans le copy marketing — décision fondateur, toujours valide en v4 (et le format de sortie n'a d'ailleurs plus de score visible du tout, voir §11).
- ❌ Ne pas remettre de section "Tarifs" sur la landing — produit 100% gratuit depuis le pivot du 2026-08-02 (README.md).
- ❌ Ne pas oublier `break-words` sur tout label de carte contenant une barre oblique sans espace (ex. "Facebook/Instagram").
- ❌ Ne pas faire de reveal de texte mot-par-mot/lettre-par-lettre — voir §8, piège déjà rencontré et corrigé une fois.

## 10. Responsive Behavior

Breakpoints Tailwind par défaut, seuil custom `min-[375px]` pour le H1 (§8). Vérifié par Playwright à 320px, 360px, 375px, 768px et 1280px sur la landing, le login et le flow de brief : aucun débordement horizontal à aucune de ces tailles.

## 11. Le flow de brief (`app/(app)/onboarding/page.tsx` + `components/onboarding/OnboardingWizard.tsx`)

**Architecture** : `page.tsx` est un Server Component qui charge le profil (`profiles.first_name`, `.brand_name`, `.default_brief`) et le passe en props à `OnboardingWizard` (Client Component) — pattern nécessaire pour préremplir le formulaire sans flash de contenu vide.

**15 étapes**, une question à la fois façon Typeform/Cal.com :
1. **Profil** (prénom + marque, deux champs sur un seul écran, skippable) — sauvegardé après chaque génération réussie, préremplit les visites suivantes.
2. Régie, format, budget, funnel (cartes à choix, sélection = avance automatiquement).
3. **Catégorie "Mon produit"** (4 champs) : industrie, produit/offre, fonctionnalités clés, preuves de crédibilité.
4. **Catégorie "Ma cible"** (3 champs) : persona, rêves/objectifs, douleurs & objections.
5. **Catégorie "Concurrence"** (2 champs, nouveau en v4) : ce que les concurrents apportent, ce qu'ils n'ont pas.
6. Visuel (optionnel) + bouton de soumission.

Les 9 champs texte sont pilotés par un seul tableau `TEXT_FIELDS` (id/catégorie/question/placeholder) et un objet d'état `Record<TextFieldId, string>` plutôt que 9 `useState` séparés — garde le fichier gérable malgré le nombre de champs.

**Préremplissage** : au montage, tout le state (platform/format/budget/funnel + les 9 champs texte) est initialisé depuis `defaultBrief` (prop serveur) si présent. Après chaque génération réussie, `/api/generate` fait un `UPDATE profiles SET default_brief = ...` best-effort (n'échoue jamais la réponse si l'update rate). Le visuel n'est **jamais** persisté dans `default_brief` — reste ponctuel par design.

**Transitions** : `AnimatePresence` sans `mode="wait"` (chevauchement fluide), chaque étape en `position: absolute inset-0` dans un conteneur `relative`. Durée 0.25s.

## 12. Format de sortie — cards, pas de score visible

Depuis le pivot v4, chaque génération renvoie `{ cards: HookCard[] }` où `HookCard = { title, description?, cta? }` — **1 hook = 1 card**, jamais de score numérique affiché (`components/GenerationResultView.tsx`). Remplace l'ancien système à deux formes (`single` candidates scorés / `rsa` bundles Google) : toutes les régies, y compris Google Ads RSA, produisent désormais des cards uniformes (`title` = le titre RSA ≤30 car., `description` = la description ≤90 car., `cta` = suggestion d'appel à l'action). Jusqu'à 5 cards par génération (`MAX_CARDS` dans `lib/gemini/generate-hooks.ts`), conformité aux limites de caractères vérifiée en code (pas seulement dans le prompt) avec fallback sur le pool brut si aucune card ne respecte les limites.

### Piège rencontré et corrigé en v4.1 : des titres, pas des hooks

Premier jet du switch Gemini : les `title` généré étaient corrects en caractères mais structurés comme des titres d'article — deux phrases collées par un point ("Vos salariés ignorent les e-learnings de 45 min. Passez aux micro-trainings de 3 min sur Slack & Teams.", ~110 car.) plutôt qu'une vraie accroche courte. Trois corrections combinées, dans `lib/gemini/generate-hooks.ts` et `lib/ad-platforms.ts` :

1. **`titleMaxChars` resserré délibérément en dessous de la vraie limite de troncature de chaque régie** (LinkedIn 150→90, Meta 125→70/carousel 80→60, Reddit 100→70 ; Google RSA reste à 30, déjà la vraie limite dure). Utiliser toute la marge de troncature produit un paragraphe, pas un hook — c'est un choix éditorial délibéré, pas juste une contrainte technique.
2. **Règle explicite en tête du system prompt** ("RÈGLE ABSOLUE SUR LE title") avec exemples few-shot bon/mauvais tirés d'un vrai cas rencontré — bien plus efficace qu'une simple mention dans une liste de contraintes.
3. **Filtre de conformité étendu en code** (`isCompoundSentence()`) : détecte un `.`/`!`/`?` suivi d'un espace puis d'une majuscule ailleurs qu'en toute fin de chaîne (signe de deux phrases collées) et rejette la card du pool "compliant" — même logique que le filtre de longueur déjà en place, avec le même fallback sur le pool brut si tout est filtré.

Résultat mesuré sur le même brief avant/après : titres passés de 89-122 caractères (structure composée) à 54-68 caractères (une seule phrase). **Si ce problème réapparaît** (titres qui recommencent à ressembler à des titres d'article), vérifier ces trois leviers dans l'ordre : le `titleMaxChars` n'a-t-il pas été élargi par erreur, la règle few-shot est-elle toujours en tête du prompt, `isCompoundSentence` est-il toujours appelé dans `isCompliant`.
