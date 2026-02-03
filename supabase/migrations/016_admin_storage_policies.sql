-- Add storage policies for admin to access videos and page-images buckets
-- This allows the admin to create signed URLs for viewing content in the admin dashboard

-- Admin can read all videos
CREATE POLICY "Admin can read all videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND
  (SELECT auth.jwt() ->> 'email') = 'team@sproutify.app'
);

-- Admin can read all page-images
CREATE POLICY "Admin can read all page-images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'page-images' AND
  (SELECT auth.jwt() ->> 'email') = 'team@sproutify.app'
);

-- Admin can read all originals (for viewing original drawings)
CREATE POLICY "Admin can read all originals"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'originals' AND
  (SELECT auth.jwt() ->> 'email') = 'team@sproutify.app'
);
