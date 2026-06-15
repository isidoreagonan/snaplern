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
