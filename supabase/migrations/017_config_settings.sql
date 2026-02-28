-- Migration: 017_config_settings
-- Description: Create config_settings table for admin-managed integration configuration

-- ============================================================================
-- CONFIG_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.config_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    data_type TEXT NOT NULL DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category, key)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_config_settings_category ON public.config_settings(category);
CREATE INDEX idx_config_settings_category_key ON public.config_settings(category, key);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_config_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER config_settings_updated_at
    BEFORE UPDATE ON public.config_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_config_settings_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.config_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view config settings"
    ON public.config_settings
    FOR SELECT
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app');

CREATE POLICY "Admin can insert config settings"
    ON public.config_settings
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'email' = 'team@sproutify.app');

CREATE POLICY "Admin can update config settings"
    ON public.config_settings
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app')
    WITH CHECK (auth.jwt() ->> 'email' = 'team@sproutify.app');

CREATE POLICY "Admin can delete config settings"
    ON public.config_settings
    FOR DELETE
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app');

CREATE POLICY "Service role can manage config settings"
    ON public.config_settings
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.config_settings IS 'Admin-managed configuration settings for integrations and app config';
COMMENT ON COLUMN public.config_settings.category IS 'Setting category: integrations, branding, etc.';
COMMENT ON COLUMN public.config_settings.key IS 'Setting key within category';
COMMENT ON COLUMN public.config_settings.value IS 'Setting value stored as text, parsed by data_type';
COMMENT ON COLUMN public.config_settings.data_type IS 'Type hint: string, number, boolean, json';
