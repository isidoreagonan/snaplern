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