CREATE TABLE public.exam_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Examen',
  subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_session_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_minutes integer NOT NULL DEFAULT 30,
  question_count integer NOT NULL DEFAULT 10,
  questions jsonb,
  answers jsonb DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  weak_points jsonb,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own exam sessions"
ON public.exam_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_exam_sessions_updated_at
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_exam_sessions_user_created ON public.exam_sessions(user_id, created_at DESC);