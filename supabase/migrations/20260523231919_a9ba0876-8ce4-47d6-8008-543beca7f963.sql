
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
