-- Ajout de colonnes pour favoris et tags sur les hooks individuels
-- On stocke ça dans une table séparée pour avoir une relation 1-N
-- (un hook peut avoir plusieurs tags)

CREATE TABLE IF NOT EXISTS public.hook_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  hook_index INTEGER NOT NULL, -- Index du hook dans le tableau cards (0-3)
  tags TEXT[], -- Tags custom
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, generation_id, hook_index)
);

CREATE INDEX IF NOT EXISTS hook_favorites_user_id_idx ON public.hook_favorites(user_id);
CREATE INDEX IF NOT EXISTS hook_favorites_generation_id_idx ON public.hook_favorites(generation_id);

-- RLS
ALTER TABLE public.hook_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
  ON public.hook_favorites
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
