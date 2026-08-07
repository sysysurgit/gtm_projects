-- Style créatif par défaut de l'entreprise (2026-08-07) : direction créative
-- ("Des hooks comme... Buzzman, Ogilvy...") définie une fois dans le profil
-- entreprise. Si définie (non null), elle s'applique à toutes les
-- générations et n'est plus redemandée dans le brief — si null/"none", le
-- choix reste fait brief par brief dans le formulaire de génération.
alter table public.profiles add column if not exists default_creative_style text;
