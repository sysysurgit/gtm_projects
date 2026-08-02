-- Générateur de hooks IA — schema initial.
-- Appliquer via le SQL Editor Supabase ou `supabase db push`.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  tier text not null default 'free' check (tier in ('free','starter','pro','agency','agency_plus')),
  stripe_customer_id text unique,
  founding_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_counters (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('lifetime','period')),
  period_start timestamptz,
  period_end timestamptz,
  count int not null default 0,
  cap int not null,
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  tier text not null,
  billing_interval text not null check (billing_interval in ('monthly','annual')),
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'linkedin_ads',
  budget_range text not null check (budget_range in ('lt_1k','1k_5k','5k_20k','gt_20k')),
  funnel_stage text not null check (funnel_stage in ('awareness','consideration','action')),
  industry text not null,
  persona text not null,
  product_offer text not null,
  language text not null default 'auto',
  created_at timestamptz not null default now()
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brief_id uuid not null references public.briefs(id) on delete cascade,
  model text not null default 'claude-sonnet-5',
  prompt_tokens int,
  completion_tokens int,
  cost_estimate_eur numeric(10,5),
  status text not null default 'completed' check (status in ('completed','failed')),
  output jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.internal_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  alert_type text not null check (alert_type in ('usage_over_2x_cap','agency_near_cap_80pct')),
  details jsonb,
  created_at timestamptz not null default now(),
  acknowledged boolean not null default false
);

create table public.signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.stripe_webhook_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

create index on public.signup_attempts (ip_hash, created_at);
create index on public.generations (user_id, created_at desc);

-- Nouveau compte -> profil + compteur gratuit (3 générations à vie), sans code applicatif.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.usage_counters (user_id, scope, count, cap)
  values (new.id, 'lifetime', 0, 3);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Réservation atomique d'un slot de génération : l'UPDATE row-lock la ligne, donc à 1 slot
-- restant, un seul de deux appels concurrents peut gagner (le second revoit count>=cap après
-- le commit du premier).
create or replace function public.claim_generation_slot(p_user_id uuid)
returns table(allowed boolean, remaining int, cap int, tier text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_cap int;
  v_count int;
  v_tier text;
begin
  -- Bare `tier`/`cap` column refs are ambiguous here: this function's OUT
  -- parameters are named allowed/remaining/cap/tier, so they shadow the
  -- profiles.tier and usage_counters.cap columns (Postgres error 42702).
  select profiles.tier into v_tier from public.profiles where id = p_user_id;

  update public.usage_counters
     set count = count + 1, updated_at = now()
   where user_id = p_user_id and usage_counters.count < usage_counters.cap
  returning usage_counters.count, usage_counters.cap into v_count, v_cap;

  if v_count is null then
    select usage_counters.cap, usage_counters.count into v_cap, v_count
    from public.usage_counters where user_id = p_user_id;
    return query select false, greatest(v_cap - coalesce(v_count, 0), 0), v_cap, v_tier;
  else
    return query select true, v_cap - v_count, v_cap, v_tier;
  end if;
end;
$$;

-- Compense un échec de génération (l'appel Anthropic a raté) pour ne pas coûter de slot.
create or replace function public.release_generation_slot(p_user_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.usage_counters set count = greatest(count - 1, 0), updated_at = now()
  where user_id = p_user_id;
$$;

-- Signaux internes : bug/abus (>2x cap, ne devrait jamais arriver vu le hard stop) et
-- comptes Agency proches de leur cap (opportunité d'upsell). Un seul non acquitté par jour/type.
create or replace function public.check_usage_alerts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tier text;
  v_type text;
begin
  select tier into v_tier from public.profiles where id = new.user_id;

  if new.count > 2 * new.cap then
    v_type := 'usage_over_2x_cap';
  elsif v_tier = 'agency' and new.count >= 0.8 * new.cap then
    v_type := 'agency_near_cap_80pct';
  else
    return new;
  end if;

  if not exists (
    select 1 from public.internal_alerts
    where user_id = new.user_id and alert_type = v_type and not acknowledged
      and created_at > now() - interval '1 day'
  ) then
    insert into public.internal_alerts (user_id, alert_type, details)
    values (new.user_id, v_type, jsonb_build_object('count', new.count, 'cap', new.cap));
  end if;

  return new;
end;
$$;

create trigger usage_counters_alert_check
  after update on public.usage_counters
  for each row execute function public.check_usage_alerts();

-- RLS : lecture de son propre état directement depuis le navigateur ; toute écriture
-- (webhook, pipeline de génération, claim/release) passe par le client service-role.
alter table public.profiles enable row level security;
alter table public.usage_counters enable row level security;
alter table public.subscriptions enable row level security;
alter table public.briefs enable row level security;
alter table public.generations enable row level security;
alter table public.internal_alerts enable row level security;
alter table public.signup_attempts enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "own usage" on public.usage_counters for select using (auth.uid() = user_id);
create policy "own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "own briefs" on public.briefs for select using (auth.uid() = user_id);
create policy "own generations" on public.generations for select using (auth.uid() = user_id);

-- internal_alerts / signup_attempts / stripe_webhook_events : aucune policy -> RLS activé
-- sans policy = inaccessible à anon/authenticated, seul le client service-role les touche.
