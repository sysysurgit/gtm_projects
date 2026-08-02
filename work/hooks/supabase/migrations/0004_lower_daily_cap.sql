-- Baisse le quota gratuit de 10 à 5 crédits/jour (2026-08-02) — offre
-- permanente ("ad vitam"), pas une réduction temporaire de lancement.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.usage_counters (user_id, scope, count, cap, last_reset_on)
  values (new.id, 'daily', 0, 5, current_date);
  return new;
end;
$$;

update public.usage_counters set cap = 5 where scope = 'daily' and cap = 10;
