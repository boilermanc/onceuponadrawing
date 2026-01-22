-- Migration: 002_creations_gallery
-- Description: Create creations table, update profiles, enable RLS, and add utility functions

-- ============================================================================
-- CREATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    subject text,
    artist_name text,
    artist_age text,
    artist_grade text,
    year text,
    original_image_path text NOT NULL,
    video_path text NOT NULL,
    analysis_json jsonb NOT NULL,
    page_images jsonb,
    created_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_creations_user_id ON public.creations(user_id);
CREATE INDEX IF NOT EXISTS idx_creations_created_at ON public.creations(created_at);

-- ============================================================================
-- PROFILES TABLE UPDATES
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS free_saves_used integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- Add check constraint for subscription_tier values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_subscription_tier_check'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_subscription_tier_check
            CHECK (subscription_tier IN ('free', 'premium'));
    END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY FOR CREATIONS
-- ============================================================================

ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own creations
CREATE POLICY "Users can select own creations"
    ON public.creations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own creations
CREATE POLICY "Users can insert own creations"
    ON public.creations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own creations (for soft delete)
CREATE POLICY "Users can update own creations"
    ON public.creations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE their own creations
CREATE POLICY "Users can delete own creations"
    ON public.creations
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKETS
-- Note: Storage buckets cannot be created via SQL migrations.
-- These must be created manually via Supabase Dashboard or using the
-- Supabase Management API / CLI.
--
-- Required buckets (all private):
--   - originals    (for original drawing images)
--   - videos       (for generated story videos)
--   - page-images  (for the 12 story page images)
--
-- To create via Supabase CLI:
--   supabase storage create originals --public=false
--   supabase storage create videos --public=false
--   supabase storage create page-images --public=false
-- ============================================================================

-- ============================================================================
-- FUNCTION: get_accessible_creations
-- Returns all creations for a user with is_locked computed column
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_accessible_creations(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    title text,
    subject text,
    artist_name text,
    artist_age text,
    artist_grade text,
    year text,
    original_image_path text,
    video_path text,
    analysis_json jsonb,
    page_images jsonb,
    created_at timestamptz,
    is_deleted boolean,
    is_locked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_premium boolean;
    user_subscription_tier text;
    user_subscription_expires timestamptz;
BEGIN
    -- Get user's subscription status from profiles
    SELECT
        p.subscription_tier,
        p.subscription_expires_at
    INTO
        user_subscription_tier,
        user_subscription_expires
    FROM public.profiles p
    WHERE p.id = user_uuid;

    -- Determine if user is currently premium
    is_premium := (
        user_subscription_tier = 'premium'
        AND user_subscription_expires IS NOT NULL
        AND user_subscription_expires > now()
    );

    RETURN QUERY
    WITH ranked_creations AS (
        SELECT
            c.*,
            ROW_NUMBER() OVER (ORDER BY c.created_at ASC) as creation_rank
        FROM public.creations c
        WHERE c.user_id = user_uuid
          AND c.is_deleted = false
    )
    SELECT
        rc.id,
        rc.user_id,
        rc.title,
        rc.subject,
        rc.artist_name,
        rc.artist_age,
        rc.artist_grade,
        rc.year,
        rc.original_image_path,
        rc.video_path,
        rc.analysis_json,
        rc.page_images,
        rc.created_at,
        rc.is_deleted,
        -- is_locked logic:
        -- false if premium user
        -- false for oldest 5 creations (rank <= 5)
        -- true for creations beyond first 5 when not premium
        CASE
            WHEN is_premium THEN false
            WHEN rc.creation_rank <= 5 THEN false
            ELSE true
        END as is_locked
    FROM ranked_creations rc
    ORDER BY rc.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_accessible_creations(uuid) TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: Check if user can save more creations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_user_save_creation(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_tier text;
    user_expires timestamptz;
    current_saves integer;
BEGIN
    -- Get user's subscription info
    SELECT
        subscription_tier,
        subscription_expires_at,
        free_saves_used
    INTO
        user_tier,
        user_expires,
        current_saves
    FROM public.profiles
    WHERE id = user_uuid;

    -- Premium users with valid subscription can always save
    IF user_tier = 'premium' AND user_expires IS NOT NULL AND user_expires > now() THEN
        RETURN true;
    END IF;

    -- Free users can save up to 3 creations
    RETURN COALESCE(current_saves, 0) < 3;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_save_creation(uuid) TO authenticated;
