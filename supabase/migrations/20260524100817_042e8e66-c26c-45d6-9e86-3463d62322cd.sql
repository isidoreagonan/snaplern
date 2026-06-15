CREATE TABLE public.mindmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  title TEXT NOT NULL DEFAULT 'Mindmap',
  subject TEXT,
  source_text TEXT,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mindmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own mindmaps"
  ON public.mindmaps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_mindmaps_updated_at
  BEFORE UPDATE ON public.mindmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mindmaps_user ON public.mindmaps(user_id, created_at DESC);
CREATE INDEX idx_mindmaps_session ON public.mindmaps(session_id);