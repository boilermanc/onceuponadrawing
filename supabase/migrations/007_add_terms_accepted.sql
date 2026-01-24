-- Migration: Add terms acceptance tracking to profiles
-- This tracks when users accept the Terms of Service and Privacy Policy

-- Add terms_accepted_at column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

-- Add terms_version column to track which version of terms was accepted
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_version text DEFAULT '2.1';

-- Update existing users to have accepted terms (grandfather them in)
-- They can be asked to re-accept if terms change significantly
UPDATE public.profiles
SET terms_accepted_at = created_at, terms_version = '2.1'
WHERE terms_accepted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp when user accepted Terms of Service and Privacy Policy';
COMMENT ON COLUMN public.profiles.terms_version IS 'Version of terms the user accepted';

-- Update the trigger function to handle terms acceptance fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, terms_accepted_at, terms_version)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.email,
    COALESCE((new.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone, now()),
    COALESCE(new.raw_user_meta_data->>'terms_version', '2.1')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
