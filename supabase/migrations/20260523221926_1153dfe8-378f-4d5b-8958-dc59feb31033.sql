CREATE TABLE public.oracle_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nouvelle discussion',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.oracle_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own oracle chats"
ON public.oracle_chats
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_oracle_chats_updated_at
BEFORE UPDATE ON public.oracle_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_oracle_chats_user_updated ON public.oracle_chats(user_id, updated_at DESC);