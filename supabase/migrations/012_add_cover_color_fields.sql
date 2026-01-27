-- Add cover customization fields to book_orders
ALTER TABLE book_orders ADD COLUMN IF NOT EXISTS cover_color_id TEXT DEFAULT 'soft-blue';
ALTER TABLE book_orders ADD COLUMN IF NOT EXISTS text_color_id TEXT DEFAULT 'gunmetal';

-- Update order_type check constraint to allow softcover
ALTER TABLE book_orders DROP CONSTRAINT IF EXISTS book_orders_order_type_check;
ALTER TABLE book_orders ADD CONSTRAINT book_orders_order_type_check CHECK (order_type IN ('ebook', 'hardcover', 'softcover'));
