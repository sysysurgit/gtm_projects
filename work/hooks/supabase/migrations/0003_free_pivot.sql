-- Pivot vers un outil 100% gratuit (2026-08-02) : plus de tiers payants, plus
-- de Stripe. Quota unique de 10 crédits/jour par utilisateur (reset auto à
-- chaque nouveau jour calendaire), chaque crédit produisant jusqu'à 5 hooks.
-- Nouveaux champs de profil (prénom, marque, brief par défaut réutilisable)
-- et de brief (catégorisation Produit / Cible / Concurrence).

-- 1. Redéfinir check_usage_alerts() AVANT de toucher profiles.tier — le
-- trigger usage_counters_alert_check tourne sur toute UPDATE de
-- usage_counters plus bas dans ce fichier, et l'ancienne version référence
-- profiles.tier qui va être supprimée à l'étape 2.
create or replace function public.check_usage_alerts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.count > 2 * new.cap and not exists (
    select 1 from public.internal_alerts
    where user_id = new.user_id and alert_type = 'usage_over_2x_cap' and not acknowledged
      and created_at > now() - interval '1 day'
  ) then
    insert into public.internal_alerts (user_id, alert_type, details)
    values (new.user_id, 'usage_over_2x_cap', jsonb_build_object('count', new.count, 'cap', new.cap));
  end if;
  return new;
end;
$$;

alter table public.internal_alerts drop constraint if exists internal_alerts_alert_type_check;
alter table public.internal_alerts add constraint internal_alerts_alert_type_check
  check (alert_type in ('usage_over_2x_cap'));

-- 2. Profils : identité + defaults réutilisables, retrait Stripe/tier.
alter table public.profiles drop column if exists tier;
alter table public.profiles drop column if exists stripe_customer_id;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists brand_name text;
alter table public.profiles add column if not exists default_brief jsonb;

-- 3. Compteur d'usage : reset quotidien plutôt que lifetime/period.
alter table public.usage_counters drop constraint if exists usage_counters_scope_check;
alter table public.usage_counters add constraint usage_counters_scope_check
  check (scope in ('lifetime', 'period', 'daily'));
alter table public.usage_counters add column if not exists last_reset_on date not null default current_date;

update public.usage_counters set scope = 'daily', cap = 10, count = 0, last_reset_on = current_date;

-- 4. Nouveau signup -> 10 crédits/jour d'office.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.usage_counters (user_id, scope, count, cap, last_reset_on)
  values (new.id, 'daily', 0, 10, current_date);
  return new;
end;
$$;

-- 5. claim_generation_slot : reset auto si le jour a changé, avant le claim
-- atomique. `tier` retourné en dur à 'free' pour ne pas casser la forme du
-- type de retour consommée côté appli (plus de vraie notion de tier).
create or replace function public.claim_generation_slot(p_user_id uuid)
returns table(allowed boolean, remaining int, cap int, tier text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_cap int;
  v_count int;
begin
  update public.usage_counters
     set count = 0, last_reset_on = current_date, updated_at = now()
   where user_id = p_user_id and last_reset_on < current_date;

  update public.usage_counters
     set count = count + 1, updated_at = now()
   where user_id = p_user_id and usage_counters.count < usage_counters.cap
  returning usage_counters.count, usage_counters.cap into v_count, v_cap;

  if v_count is null then
    select usage_counters.cap, usage_counters.count into v_cap, v_count
    from public.usage_counters where user_id = p_user_id;
    return query select false, greatest(v_cap - coalesce(v_count, 0), 0), v_cap, 'free'::text;
  else
    return query select true, v_cap - v_count, v_cap, 'free'::text;
  end if;
end;
$$;

-- 6. Stripe : plus utilisé (jamais eu de vraie transaction) — retiré proprement.
drop table if exists public.subscriptions;
drop table if exists public.stripe_webhook_events;

-- 7. Briefs : nouvelle catégorisation Produit / Cible / Concurrence.
alter table public.briefs add column if not exists key_features text;
alter table public.briefs add column if not exists credibility_proof text;
alter table public.briefs add column if not exists target_goals text;
alter table public.briefs add column if not exists target_pains_objections text;
alter table public.briefs add column if not exists competitor_strengths text;
alter table public.briefs add column if not exists competitor_gaps text;

-- 8. Generations : le modèle par défaut change (Gemini, plus Claude).
alter table public.generations alter column model set default 'gemini-3.5-flash';
