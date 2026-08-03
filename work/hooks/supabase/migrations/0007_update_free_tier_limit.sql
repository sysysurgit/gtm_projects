-- Retour au modèle 100% gratuit : 5 crédits par jour
-- Modifie le trigger handle_new_user pour créer des comptes avec daily/5

-- 1. Modifier le trigger handle_new_user pour créer des comptes avec daily/5
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (new.id, new.email);
  INSERT INTO public.usage_counters (user_id, scope, count, cap, last_reset_on)
  VALUES (new.id, 'daily', 0, 5, CURRENT_DATE);
  RETURN new;
END;
$$;

-- 2. Ajouter 'monthly' au constraint scope si pas déjà là
ALTER TABLE public.usage_counters DROP CONSTRAINT IF EXISTS usage_counters_scope_check;
ALTER TABLE public.usage_counters ADD CONSTRAINT usage_counters_scope_check
  CHECK (scope IN ('lifetime', 'period', 'daily', 'monthly'));

-- 3. Modifier claim_generation_slot pour gérer le reset mensuel
CREATE OR REPLACE FUNCTION public.claim_generation_slot(p_user_id uuid)
RETURNS TABLE(allowed boolean, remaining int, cap int, tier text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cap int;
  v_count int;
  v_scope text;
  v_reset_date date;
BEGIN
  -- Récupérer le scope actuel
  SELECT usage_counters.scope, usage_counters.last_reset_on
  INTO v_scope, v_reset_date
  FROM public.usage_counters
  WHERE user_id = p_user_id;

  -- Reset si nécessaire selon le scope
  IF v_scope = 'daily' AND v_reset_date < CURRENT_DATE THEN
    UPDATE public.usage_counters
       SET count = 0, last_reset_on = CURRENT_DATE, updated_at = NOW()
     WHERE user_id = p_user_id;
  ELSIF v_scope = 'monthly' AND v_reset_date < DATE_TRUNC('month', CURRENT_DATE)::date THEN
    UPDATE public.usage_counters
       SET count = 0, last_reset_on = DATE_TRUNC('month', CURRENT_DATE)::date, updated_at = NOW()
     WHERE user_id = p_user_id;
  END IF;

  -- Claim atomique
  UPDATE public.usage_counters
     SET count = count + 1, updated_at = NOW()
   WHERE user_id = p_user_id AND usage_counters.count < usage_counters.cap
  RETURNING usage_counters.count, usage_counters.cap INTO v_count, v_cap;

  IF v_count IS NULL THEN
    SELECT usage_counters.cap, usage_counters.count INTO v_cap, v_count
    FROM public.usage_counters WHERE user_id = p_user_id;
    RETURN QUERY SELECT FALSE, GREATEST(v_cap - COALESCE(v_count, 0), 0), v_cap, 'free'::text;
  ELSE
    RETURN QUERY SELECT TRUE, v_cap - v_count, v_cap, 'free'::text;
  END IF;
END;
$$;
