-- Migration: 006_add_shipping_fields
-- Description: Add shipping_level_id and shipping_address2 to book_orders table

-- Add shipping_level_id to store the Lulu shipping option selected (e.g., "MAIL", "PRIORITY_MAIL", "GROUND", etc.)
ALTER TABLE public.book_orders 
ADD COLUMN IF NOT EXISTS shipping_level_id text;

-- Add shipping_address2 field (already exists as shipping_address, but this is for apartment/suite number)
ALTER TABLE public.book_orders 
ADD COLUMN IF NOT EXISTS shipping_address2 text;

-- Add contact_email field for customer service
ALTER TABLE public.book_orders 
ADD COLUMN IF NOT EXISTS contact_email text;

-- Add comment
COMMENT ON COLUMN public.book_orders.shipping_level_id IS 'Lulu shipping level code (MAIL, PRIORITY_MAIL, GROUND, etc.)';
COMMENT ON COLUMN public.book_orders.shipping_address2 IS 'Apartment, suite, unit number, etc.';
COMMENT ON COLUMN public.book_orders.contact_email IS 'Customer email for order updates';
