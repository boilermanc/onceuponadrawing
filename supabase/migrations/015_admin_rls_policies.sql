-- Migration: Add admin SELECT policies for dashboard access
-- The admin user (team@sproutify.app) needs to view all rows for the dashboard
-- Uses DO blocks to safely add policies only if tables exist

-- Admin can view all creations (for stories list, dashboard, preview generation)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creations') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creations' AND policyname = 'Admin can view all creations') THEN
            CREATE POLICY "Admin can view all creations"
                ON public.creations
                FOR SELECT
                USING (auth.jwt() ->> 'email' = 'team@sproutify.app');
        END IF;
    END IF;
END $$;

-- Admin can view all profiles (for user counts, customer list, growth charts)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admin can view all profiles') THEN
            CREATE POLICY "Admin can view all profiles"
                ON public.profiles
                FOR SELECT
                USING (auth.jwt() ->> 'email' = 'team@sproutify.app');
        END IF;
    END IF;
END $$;

-- Admin can view all credit transactions (for potential future analytics)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_transactions' AND policyname = 'Admin can view all credit transactions') THEN
            CREATE POLICY "Admin can view all credit transactions"
                ON public.credit_transactions
                FOR SELECT
                USING (auth.jwt() ->> 'email' = 'team@sproutify.app');
        END IF;
    END IF;
END $$;
