
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
