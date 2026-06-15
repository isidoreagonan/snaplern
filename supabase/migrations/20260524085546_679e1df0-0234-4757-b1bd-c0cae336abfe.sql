
-- Exercices progressifs liés à un parcours d'apprentissage
CREATE TABLE public.session_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  level int NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT 'Exercice',
  statement text NOT NULL,
  expected_answer text,
  hints jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_exercises_session ON public.session_exercises(session_id, level);
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own exercises" ON public.session_exercises
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tentatives / corrections IA
CREATE TABLE public.exercise_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id uuid NOT NULL,
  user_id uuid NOT NULL,
  submission_type text NOT NULL DEFAULT 'text',
  submission_text text,
  submission_image_url text,
  feedback text,
  score int NOT NULL DEFAULT 0,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_exercise_attempts_user_ex ON public.exercise_attempts(user_id, exercise_id);
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own attempts ex" ON public.exercise_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Résolveur d'exercice (standalone)
CREATE TABLE public.exercise_solves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Exercice',
  subject text,
  image_url text NOT NULL,
  solution jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_exercise_solves_user ON public.exercise_solves(user_id, created_at DESC);
ALTER TABLE public.exercise_solves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own solves" ON public.exercise_solves
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_exercise_solves_updated_at
  BEFORE UPDATE ON public.exercise_solves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
