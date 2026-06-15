
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
