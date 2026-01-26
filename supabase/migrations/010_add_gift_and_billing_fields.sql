-- Migration: 010_add_gift_and_billing_fields
-- Description: Add is_gift flag and billing address fields for gift orders

-- Add is_gift flag to indicate if this is a gift order
ALTER TABLE public.book_orders
ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT false;

-- Add billing address fields (purchaser's address for gift orders)
ALTER TABLE public.book_orders
ADD COLUMN IF NOT EXISTS billing_name text;

ALTER TABLE public.book_orders
ADD COLUMN IF NOT EXISTS billing_street1 text;

ALTER TABLE public.book_orders
ADD COLUMN IF NOT EXISTS billing_street2 text;

ALTER TABLE public.book_orders
ADD COLUMN IF NOT EXISTS billing_city text;

ALTER TABLE public.book_orders
ADD COLUMN IF NOT EXISTS billing_state text;

ALTER TABLE public.book_orders
ADD COLUMN IF NOT EXISTS billing_zip text;

ALTER TABLE public.book_orders
ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'US';

-- Add comments
COMMENT ON COLUMN public.book_orders.is_gift IS 'True if this order is being sent as a gift to someone else';
COMMENT ON COLUMN public.book_orders.billing_name IS 'Purchaser name (for gift orders, different from shipping/recipient)';
COMMENT ON COLUMN public.book_orders.billing_street1 IS 'Purchaser street address';
COMMENT ON COLUMN public.book_orders.billing_street2 IS 'Purchaser apartment, suite, unit number';
COMMENT ON COLUMN public.book_orders.billing_city IS 'Purchaser city';
COMMENT ON COLUMN public.book_orders.billing_state IS 'Purchaser state code (2 letters)';
COMMENT ON COLUMN public.book_orders.billing_zip IS 'Purchaser postal/ZIP code';
COMMENT ON COLUMN public.book_orders.billing_country IS 'Purchaser country code (default US)';
