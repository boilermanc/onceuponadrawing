-- Create storage bucket for book PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-pdfs', 'book-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for book-pdfs bucket
-- Allow service role to upload/download (for Edge Functions)
CREATE POLICY "Service role can upload book PDFs"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'book-pdfs');

CREATE POLICY "Service role can update book PDFs"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'book-pdfs');

CREATE POLICY "Service role can read book PDFs"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'book-pdfs');

CREATE POLICY "Service role can delete book PDFs"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'book-pdfs');

-- Allow authenticated users to read their own book PDFs
CREATE POLICY "Users can read their own book PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'book-pdfs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM book_orders WHERE user_id = auth.uid()
  )
);

-- Allow admin to read all book PDFs
CREATE POLICY "Admin can read all book PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'book-pdfs' AND
  (SELECT auth.jwt() ->> 'email') = 'team@sproutify.app'
);
