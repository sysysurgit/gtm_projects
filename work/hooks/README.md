# Hooks

Générateur de hooks publicitaires B2B — gratuit.

Outil qui génère des hooks/ad copy pour LinkedIn, Meta, Google et Reddit Ads, différencié d'un
wrapper ChatGPT par un onboarding contextuel riche (régie, budget, funnel, produit, cible,
concurrence) injecté dans chaque génération. Comme `verificateur-score-geo`, c'est un outil
public gratuit, pas un SaaS payant — voir `DESIGN.md` pour l'historique de ce choix.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Auth + Postgres), Gemini
(`gemini-3.5-flash`, `@google/genai`) pour la génération, `motion` pour l'animation.

## Getting Started

```bash
cp .env.example .env.local   # renseigner les clés Supabase/Gemini
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Schéma DB : `supabase/migrations/` (appliquer dans l'ordre), sur le projet Supabase dédié à ce
projet — pas celui d'un autre outil du repo — via le SQL Editor ou `supabase db push`.

## Modèle d'usage

100% gratuit. 10 crédits par jour par utilisateur (reset à minuit UTC), jusqu'à 5 hooks générés
par crédit. Pas de tiers payants, pas de Stripe — voir `supabase/migrations/0003_free_pivot.sql`
pour le détail du pivot (ancien système de tiers/facturation retiré proprement, jamais eu de
vraie transaction).

Les emails des inscrits sont déjà capturés nativement dans `public.profiles.email` (aucun outil
externe branché) — c'est la liste à exploiter plus tard.

## Statut

Fonctionnel de bout en bout : auth, profil réutilisable (prénom/marque/brief par défaut),
questionnaire catégorisé (Produit / Cible / Concurrence), génération Gemini, historique.
