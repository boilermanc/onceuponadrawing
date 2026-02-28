-- Add featured columns to creations table
ALTER TABLE public.creations
    ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS featured_at timestamptz,
    ADD COLUMN IF NOT EXISTS featured_thumbnail_url text,
    ADD COLUMN IF NOT EXISTS featured_page_url text,
    ADD COLUMN IF NOT EXISTS featured_pages jsonb;

-- Create index for faster featured creations queries
CREATE INDEX IF NOT EXISTS idx_creations_is_featured ON public.creations(is_featured) WHERE is_featured = true;
