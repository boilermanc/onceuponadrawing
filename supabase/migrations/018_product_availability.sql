-- Migration: 018_product_availability
-- Description: Seed product availability settings for admin-controlled product toggles

INSERT INTO public.config_settings (category, key, value, data_type, description)
VALUES
    ('products', 'ebook_enabled', 'true', 'boolean', 'Whether the digital ebook is available for purchase'),
    ('products', 'softcover_enabled', 'true', 'boolean', 'Whether the softcover book is available for purchase'),
    ('products', 'hardcover_enabled', 'true', 'boolean', 'Whether the hardcover book is available for purchase')
ON CONFLICT (category, key) DO NOTHING;
