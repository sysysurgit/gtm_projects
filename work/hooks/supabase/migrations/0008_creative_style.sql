-- Direction créative optionnelle ("comme si écrit par X") sur le brief —
-- feature demandée par l'utilisateur, voir lib/creative-styles.ts pour les
-- valeurs possibles. Toujours nullable : aucune valeur par défaut imposée.
alter table public.briefs add column creative_style text;
