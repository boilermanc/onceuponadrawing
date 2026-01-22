-- Migration: 004_book_orders
-- Description: Create book_orders table to track storybook purchases (ebook and hardcover)

-- ============================================================================
-- BOOK_ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.book_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creation_id uuid NOT NULL REFERENCES public.creations(id) ON DELETE RESTRICT,

    -- Order type and status
    order_type text NOT NULL CHECK (order_type IN ('ebook', 'hardcover')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Order created, awaiting payment
        'payment_received',  -- Stripe payment confirmed
        'processing',        -- PDF being generated
        'printed',           -- Sent to Lulu, printing complete
        'shipped',           -- Tracking number received
        'delivered',         -- Delivery confirmed
        'cancelled'          -- Order cancelled/refunded
    )),

    -- Book content
    dedication_text text,    -- Optional dedication for the book's first page

    -- Stripe payment info
    stripe_session_id text,
    stripe_payment_intent_id text,
    amount_paid integer NOT NULL, -- Total amount in cents

    -- Shipping info (for hardcover orders)
    shipping_name text,
    shipping_address text,
    shipping_city text,
    shipping_state text,
    shipping_zip text,
    shipping_country text DEFAULT 'US',
    shipping_phone text,
    shipping_email text,

    -- Fulfillment info
    lulu_order_id text,      -- Filled when order sent to Lulu printer
    tracking_number text,    -- Shipping tracking number
    tracking_url text,       -- Carrier tracking URL

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_book_orders_user_id ON public.book_orders(user_id);
CREATE INDEX idx_book_orders_creation_id ON public.book_orders(creation_id);
CREATE INDEX idx_book_orders_status ON public.book_orders(status);
CREATE INDEX idx_book_orders_stripe_session_id ON public.book_orders(stripe_session_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_book_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER book_orders_updated_at
    BEFORE UPDATE ON public.book_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_book_orders_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own book orders"
    ON public.book_orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create orders for their own creations
CREATE POLICY "Users can create book orders for own creations"
    ON public.book_orders
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.creations c
            WHERE c.id = creation_id
            AND c.user_id = auth.uid()
        )
    );

-- Policy: Users can update their own orders (limited - mainly for cancellation)
CREATE POLICY "Users can update own book orders"
    ON public.book_orders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ADMIN POLICIES
-- ============================================================================

-- Policy: Admin can view all book orders
CREATE POLICY "Admin can view all book orders"
    ON public.book_orders
    FOR SELECT
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app');

-- Policy: Admin can update all book orders
CREATE POLICY "Admin can update all book orders"
    ON public.book_orders
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app')
    WITH CHECK (auth.jwt() ->> 'email' = 'team@sproutify.app');

-- ============================================================================
-- SERVICE ROLE POLICY (for webhook updates)
-- ============================================================================

-- Note: Service role bypasses RLS, so the webhook can update any order
-- using the service role key. No additional policy needed.

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.book_orders IS 'Tracks storybook orders (ebook and hardcover) with Stripe payment and Lulu fulfillment';
COMMENT ON COLUMN public.book_orders.order_type IS 'ebook ($12.99) or hardcover ($47.98 with shipping)';
COMMENT ON COLUMN public.book_orders.amount_paid IS 'Total amount charged in cents (1299 for ebook, 4798 for hardcover)';
COMMENT ON COLUMN public.book_orders.lulu_order_id IS 'Order ID from Lulu API when hardcover sent to printer';
