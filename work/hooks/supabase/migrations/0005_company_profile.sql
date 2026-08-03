-- Profil entreprise persistant (2026-08-02) : contexte + contraintes de
-- l'entreprise cliente, distinct du brief par génération (default_brief).
-- Le brief change à chaque annonce (offre, persona, funnel...) ; le profil
-- entreprise est stable dans le temps (positionnement, ton de marque,
-- contraintes de conformité) et s'applique à TOUTES les générations sans
-- avoir à le retaper. Colonnes ajoutées à profiles plutôt qu'une table
-- séparée : un seul profil entreprise par utilisateur, même pattern que
-- first_name/brand_name déjà présents.
alter table public.profiles add column if not exists company_description text;
alter table public.profiles add column if not exists brand_tone text;
alter table public.profiles add column if not exists compliance_notes text;
