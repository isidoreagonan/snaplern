
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  analyses_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Learning sessions
CREATE TABLE public.learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sans titre',
  subject TEXT,
  image_url TEXT NOT NULL,
  analysis JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own sessions" ON public.learning_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sessions_user ON public.learning_sessions(user_id, created_at DESC);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own attempts" ON public.quiz_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Flashcards
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty INT NOT NULL DEFAULT 0,
  next_review TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own flashcards" ON public.flashcards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_flashcards_review ON public.flashcards(user_id, next_review);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.learning_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for uploaded images
INSERT INTO storage.buckets (id, name, public) VALUES ('learning-images', 'learning-images', true);

CREATE POLICY "Users can view learning images" ON storage.objects
  FOR SELECT USING (bucket_id = 'learning-images');
CREATE POLICY "Users can upload own learning images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'learning-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own learning images" ON storage.objects
  FOR DELETE USING (bucket_id = 'learning-images' AND auth.uid()::text = (storage.foldername(name))[1]);
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
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS study_level text,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure new auth users get a profile (trigger may not exist yet)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subscriptions table (populated by Stripe webhook)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Helper function: is user currently entitled to Pro features?
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active', 'trialing', 'past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

-- Free tier usage counters on profiles
ALTER TABLE public.profiles
  ADD COLUMN monthly_uploads_count integer NOT NULL DEFAULT 0,
  ADD COLUMN monthly_uploads_month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  ADD COLUMN daily_oracle_count integer NOT NULL DEFAULT 0,
  ADD COLUMN daily_oracle_date date NOT NULL DEFAULT current_date,
  ADD COLUMN stripe_customer_id text;

-- Atomic increment + reset for uploads quota
CREATE OR REPLACE FUNCTION public.consume_upload_quota(p_user uuid, p_limit integer)
RETURNS TABLE(allowed boolean, used integer, quota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_month text := to_char(now(), 'YYYY-MM');
  new_count integer;
BEGIN
  UPDATE public.profiles
    SET monthly_uploads_count = CASE WHEN monthly_uploads_month = cur_month THEN monthly_uploads_count + 1 ELSE 1 END,
        monthly_uploads_month = cur_month
    WHERE user_id = p_user
    RETURNING monthly_uploads_count INTO new_count;
  IF new_count IS NULL THEN
    RETURN QUERY SELECT false, 0, p_limit;
    RETURN;
  END IF;
  IF new_count > p_limit THEN
    -- rollback the increment
    UPDATE public.profiles SET monthly_uploads_count = monthly_uploads_count - 1 WHERE user_id = p_user;
    RETURN QUERY SELECT false, p_limit, p_limit;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, new_count, p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_oracle_quota(p_user uuid, p_limit integer)
RETURNS TABLE(allowed boolean, used integer, quota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := current_date;
  new_count integer;
BEGIN
  UPDATE public.profiles
    SET daily_oracle_count = CASE WHEN daily_oracle_date = today THEN daily_oracle_count + 1 ELSE 1 END,
        daily_oracle_date = today
    WHERE user_id = p_user
    RETURNING daily_oracle_count INTO new_count;
  IF new_count IS NULL THEN
    RETURN QUERY SELECT false, 0, p_limit;
    RETURN;
  END IF;
  IF new_count > p_limit THEN
    UPDATE public.profiles SET daily_oracle_count = daily_oracle_count - 1 WHERE user_id = p_user;
    RETURN QUERY SELECT false, p_limit, p_limit;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, new_count, p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_upload_quota(p_limit integer)
RETURNS TABLE(allowed boolean, used integer, quota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur_month text := to_char(now(), 'YYYY-MM');
  new_count integer;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT false, 0, p_limit;
    RETURN;
  END IF;
  UPDATE public.profiles
    SET monthly_uploads_count = CASE WHEN monthly_uploads_month = cur_month THEN monthly_uploads_count + 1 ELSE 1 END,
        monthly_uploads_month = cur_month
    WHERE user_id = uid
    RETURNING monthly_uploads_count INTO new_count;
  IF new_count IS NULL THEN
    RETURN QUERY SELECT false, 0, p_limit;
    RETURN;
  END IF;
  IF new_count > p_limit THEN
    UPDATE public.profiles SET monthly_uploads_count = monthly_uploads_count - 1 WHERE user_id = uid;
    RETURN QUERY SELECT false, p_limit, p_limit;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, new_count, p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_oracle_quota(p_limit integer)
RETURNS TABLE(allowed boolean, used integer, quota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := current_date;
  new_count integer;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT false, 0, p_limit;
    RETURN;
  END IF;
  UPDATE public.profiles
    SET daily_oracle_count = CASE WHEN daily_oracle_date = today THEN daily_oracle_count + 1 ELSE 1 END,
        daily_oracle_date = today
    WHERE user_id = uid
    RETURNING daily_oracle_count INTO new_count;
  IF new_count IS NULL THEN
    RETURN QUERY SELECT false, 0, p_limit;
    RETURN;
  END IF;
  IF new_count > p_limit THEN
    UPDATE public.profiles SET daily_oracle_count = daily_oracle_count - 1 WHERE user_id = uid;
    RETURN QUERY SELECT false, p_limit, p_limit;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, new_count, p_limit;
END;
$$;

-- Drop the two-arg versions
DROP FUNCTION IF EXISTS public.consume_upload_quota(uuid, integer);
DROP FUNCTION IF EXISTS public.consume_oracle_quota(uuid, integer);

REVOKE EXECUTE ON FUNCTION public.consume_upload_quota(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_oracle_quota(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon;

-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Grant admin role to isidoreagonan@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('ad5c8904-c75c-494c-a52c-f5e9bc2f9497', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

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
-- 1) Storage: add explicit UPDATE policy scoped to file owner (folder = auth.uid())
CREATE POLICY "Users can update own learning images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'learning-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'learning-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2) Restrict EXECUTE on SECURITY DEFINER functions to authenticated users only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_upload_quota(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_upload_quota(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_oracle_quota(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_oracle_quota(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Make learning-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'learning-images';

-- Drop existing public SELECT policy and replace with owner-scoped
DROP POLICY IF EXISTS "Public read learning images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view learning images" ON storage.objects;
DROP POLICY IF EXISTS "learning-images public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view learning images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for learning-images" ON storage.objects;
DROP POLICY IF EXISTS "learning images select" ON storage.objects;

CREATE POLICY "Owners can read learning images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'learning-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
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
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS interval_days numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ease_factor numeric NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS repetitions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS subject text;

CREATE INDEX IF NOT EXISTS idx_flashcards_user_due ON public.flashcards(user_id, next_review);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_audio_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_audio_month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM');

CREATE OR REPLACE FUNCTION public.consume_audio_quota(p_limit integer)
RETURNS TABLE(allowed boolean, used integer, quota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  cur_month text := to_char(now(), 'YYYY-MM');
  new_count integer;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT false, 0, p_limit;
    RETURN;
  END IF;
  UPDATE public.profiles
    SET monthly_audio_count = CASE WHEN monthly_audio_month = cur_month THEN monthly_audio_count + 1 ELSE 1 END,
        monthly_audio_month = cur_month
    WHERE user_id = uid
    RETURNING monthly_audio_count INTO new_count;
  IF new_count IS NULL THEN
    RETURN QUERY SELECT false, 0, p_limit;
    RETURN;
  END IF;
  IF new_count > p_limit THEN
    UPDATE public.profiles SET monthly_audio_count = monthly_audio_count - 1 WHERE user_id = uid;
    RETURN QUERY SELECT false, p_limit, p_limit;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, new_count, p_limit;
END;
$function$;
