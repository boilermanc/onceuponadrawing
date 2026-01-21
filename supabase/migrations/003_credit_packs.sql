-- Migration: Credit Packs System
-- Add credit_balance to profiles and create credit_transactions table

-- Add credit_balance column to profiles table
ALTER TABLE profiles ADD COLUMN credit_balance INTEGER DEFAULT 0;

-- Create credit_transactions table to track all credit purchases and usage
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'expiration', 'gift')),
  amount INTEGER NOT NULL, -- positive for additions, negative for usage
  balance_after INTEGER NOT NULL, -- running balance after transaction
  pack_name TEXT CHECK (pack_name IN ('starter', 'popular', 'best_value') OR pack_name IS NULL),
  price_cents INTEGER, -- for purchases only
  stripe_payment_intent_id TEXT,
  expires_at TIMESTAMPTZ, -- 1 year from purchase
  creation_id UUID REFERENCES creations(id), -- for usage records
  created_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Create indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_expires_at ON credit_transactions(expires_at);

-- Enable RLS on credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own transactions
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);
