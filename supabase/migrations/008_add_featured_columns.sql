-- Migration: 008_add_featured_columns
-- Description: Add featured gallery columns to creations table

-- Add featured columns to creations table
ALTER TABLE public.creations
    ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS featured_at timestamptz,
    ADD COLUMN IF NOT EXISTS featured_thumbnail_url text,
    ADD COLUMN IF NOT EXISTS featured_page_url text,
    ADD COLUMN IF NOT EXISTS featured_pages jsonb;

-- Create index for faster featured creations queries
CREATE INDEX IF NOT EXISTS idx_creations_is_featured ON public.creations(is_featured) WHERE is_featured = true;

-- Add RLS policy for admin to update featured status
CREATE POLICY IF NOT EXISTS "Admin can update featured status"
    ON public.creations
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app')
    WITH CHECK (auth.jwt() ->> 'email' = 'team@sproutify.app');

-- Add comment
COMMENT ON COLUMN public.creations.is_featured IS 'Whether this creation is featured on the homepage gallery';
COMMENT ON COLUMN public.creations.featured_at IS 'When this creation was featured';
COMMENT ON COLUMN public.creations.featured_thumbnail_url IS 'Public URL of the thumbnail image in public-gallery bucket';
COMMENT ON COLUMN public.creations.featured_page_url IS 'Public URL of the full page image in public-gallery bucket';
COMMENT ON COLUMN public.creations.featured_pages IS 'JSON array of public URLs for all featured page images (up to 4)';
