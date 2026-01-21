import { supabase } from './supabaseClient';

// Constants
const FREE_CREATION_LIMIT = 3;
const CREDIT_PACK_PRICES = {
  starter: { credits: 3, cents: 1299 },
  popular: { credits: 5, cents: 1999 },
  best_value: { credits: 10, cents: 3499 }
} as const;

// Types
export interface CreditBalance {
  freeRemaining: number;
  paidCredits: number;
  totalAvailable: number;
}

export interface CanCreateResult {
  canCreate: boolean;
  reason?: 'ok' | 'no_credits' | 'not_authenticated';
  willUse: 'free' | 'paid' | null;
}

export interface UseCreditsResult {
  success: boolean;
  usedType: 'free' | 'paid';
  newBalance: CreditBalance;
}

export type PackName = keyof typeof CREDIT_PACK_PRICES;

// Exported constants for use elsewhere
export { FREE_CREATION_LIMIT, CREDIT_PACK_PRICES };

/**
 * Get the current credit balance for a user
 */
export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('free_saves_used, credit_balance')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[creditsService] Error fetching profile:', error);
    throw new Error('Failed to fetch credit balance');
  }

  const freeSavesUsed = profile?.free_saves_used ?? 0;
  const creditBalance = profile?.credit_balance ?? 0;
  const freeRemaining = Math.max(0, FREE_CREATION_LIMIT - freeSavesUsed);

  return {
    freeRemaining,
    paidCredits: creditBalance,
    totalAvailable: freeRemaining + creditBalance
  };
}

/**
 * Check if a user can create a new creation
 */
export async function canCreate(userId: string): Promise<CanCreateResult> {
  if (!userId) {
    return { canCreate: false, reason: 'not_authenticated', willUse: null };
  }

  const balance = await getCreditBalance(userId);

  if (balance.freeRemaining > 0) {
    return { canCreate: true, reason: 'ok', willUse: 'free' };
  }

  if (balance.paidCredits > 0) {
    return { canCreate: true, reason: 'ok', willUse: 'paid' };
  }

  return { canCreate: false, reason: 'no_credits', willUse: null };
}

/**
 * Use a credit for a creation (either free or paid)
 */
export async function useCredit(userId: string, creationId: string): Promise<UseCreditsResult> {
  const createResult = await canCreate(userId);

  if (!createResult.canCreate || !createResult.willUse) {
    throw new Error('User cannot create: ' + createResult.reason);
  }

  if (createResult.willUse === 'free') {
    // Increment free_saves_used in profiles
    const { error } = await supabase.rpc('increment_free_saves_used', { user_id: userId });

    if (error) {
      // Fallback to direct update if RPC doesn't exist
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ free_saves_used: supabase.rpc('increment', { x: 1 }) })
        .eq('id', userId);

      if (updateError) {
        // Final fallback: fetch and update
        const { data: profile } = await supabase
          .from('profiles')
          .select('free_saves_used')
          .eq('id', userId)
          .single();

        const currentUsed = profile?.free_saves_used ?? 0;
        const { error: finalError } = await supabase
          .from('profiles')
          .update({ free_saves_used: currentUsed + 1 })
          .eq('id', userId);

        if (finalError) {
          console.error('[creditsService] Error incrementing free_saves_used:', finalError);
          throw new Error('Failed to use free credit');
        }
      }
    }

    const newBalance = await getCreditBalance(userId);
    return { success: true, usedType: 'free', newBalance };
  }

  // Using paid credit
  // Get current balance for the transaction record
  const currentBalance = await getCreditBalance(userId);
  const newPaidBalance = currentBalance.paidCredits - 1;

  // Decrement credit_balance in profiles
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credit_balance: newPaidBalance })
    .eq('id', userId);

  if (updateError) {
    console.error('[creditsService] Error decrementing credit_balance:', updateError);
    throw new Error('Failed to use paid credit');
  }

  // Insert credit_transactions row
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      type: 'usage',
      amount: -1,
      balance_after: newPaidBalance,
      creation_id: creationId
    });

  if (transactionError) {
    console.error('[creditsService] Error inserting transaction:', transactionError);
    // Don't throw here - the credit was already used, just log the error
  }

  const newBalance = await getCreditBalance(userId);
  return { success: true, usedType: 'paid', newBalance };
}

/**
 * Add credits to a user's account after a purchase
 */
export async function addCredits(
  userId: string,
  packName: PackName,
  stripePaymentIntentId: string
): Promise<number> {
  const pack = CREDIT_PACK_PRICES[packName];
  if (!pack) {
    throw new Error('Invalid pack name: ' + packName);
  }

  // Get current balance
  const currentBalance = await getCreditBalance(userId);
  const newBalance = currentBalance.paidCredits + pack.credits;

  // Update credit_balance in profiles
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credit_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    console.error('[creditsService] Error updating credit_balance:', updateError);
    throw new Error('Failed to add credits');
  }

  // Calculate expiration date (1 year from now)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  // Insert credit_transactions row
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      type: 'purchase',
      amount: pack.credits,
      balance_after: newBalance,
      pack_name: packName,
      price_cents: pack.cents,
      stripe_payment_intent_id: stripePaymentIntentId,
      expires_at: expiresAt.toISOString()
    });

  if (transactionError) {
    console.error('[creditsService] Error inserting purchase transaction:', transactionError);
    // Don't throw - credits were added successfully
  }

  return newBalance;
}
