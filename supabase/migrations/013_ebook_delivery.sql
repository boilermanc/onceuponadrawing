-- Migration: 013_ebook_delivery
-- Description: Add ebook delivery support — download_url, completed_at, and 'completed' status

-- Add download_url for ebook delivery (signed URL or storage path)
ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS download_path TEXT; -- Storage path for regenerating signed URLs
ALTER TABLE public.book_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update status constraint to include 'completed' for ebook orders
ALTER TABLE public.book_orders DROP CONSTRAINT IF EXISTS book_orders_status_check;
ALTER TABLE public.book_orders ADD CONSTRAINT book_orders_status_check
  CHECK (status IN (
    'pending',           -- Order created, awaiting payment
    'payment_received',  -- Stripe payment confirmed
    'processing',        -- PDF being generated
    'completed',         -- Ebook ready for download
    'printed',           -- Sent to Lulu, printing complete (physical books)
    'shipped',           -- Tracking number received (physical books)
    'delivered',         -- Delivery confirmed
    'cancelled'          -- Order cancelled/refunded
  ));

COMMENT ON COLUMN public.book_orders.download_url IS 'Signed URL for ebook download (expires, regenerate from download_path)';
COMMENT ON COLUMN public.book_orders.download_path IS 'Storage path in book-pdfs bucket for regenerating signed download URLs';
COMMENT ON COLUMN public.book_orders.completed_at IS 'When ebook was generated and made available for download';
