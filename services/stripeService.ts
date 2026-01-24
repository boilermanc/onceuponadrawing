import { supabase } from './supabaseClient';

type PackName = 'starter' | 'popular' | 'best_value';

export async function createCheckout(packName: PackName): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  console.log('[Stripe] Session exists:', !!session);
  console.log('[Stripe] Access token exists:', !!session?.access_token);

  if (!session) {
    throw new Error('Not authenticated');
  }

  console.log('[Stripe] Calling create-checkout with pack:', packName);

  const response = await supabase.functions.invoke('create-checkout', {
    body: {
      pack: packName,
      success_url: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/`,
    },
  });

  console.log('[Stripe] Response:', response);
  console.log('[Stripe] Response error:', response.error);
  console.log('[Stripe] Response data:', response.data);

  if (response.error) {
    console.error('Checkout error details:', response.error);
    // Try to get more details from the error response
    if (response.error.context) {
      console.error('Error context:', response.error.context);
    }
    // Check if there's a response body with more details
    try {
      const errorBody = await response.error.context?.json?.();
      console.error('Error body:', errorBody);
    } catch (e) {
      // ignore
    }
    throw new Error(response.error.message || 'Failed to create checkout');
  }

  if (!response.data?.checkout_url) {
    throw new Error('No checkout URL returned');
  }

  return response.data.checkout_url;
}
