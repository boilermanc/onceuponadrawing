-- Migration: 011_add_proof_approval
-- Description: Add proof approval tracking to creations table

ALTER TABLE public.creations
  ADD COLUMN IF NOT EXISTS proof_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_approved_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.creations.proof_approved_at IS 'Timestamp when the customer approved the book proof for printing';
COMMENT ON COLUMN public.creations.proof_approved_by IS 'User who approved the book proof';
