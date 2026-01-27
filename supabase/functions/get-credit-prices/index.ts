import { LOOKUP_KEYS, getPricesByLookupKeys, formatPrice, StripePrice } from '../_shared/stripe-pricing.ts';

const CREDITS: Record<string, number> = {
  starter_pack: 3,
  popular_pack: 5,
  best_value_pack: 10,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('[get-credit-prices] Request received:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const lookupKeys = [
      LOOKUP_KEYS.credits.starter,
      LOOKUP_KEYS.credits.popular,
      LOOKUP_KEYS.credits.best_value,
    ];

    const prices = await getPricesByLookupKeys(lookupKeys);
    const priceMap = new Map<string, StripePrice>(prices.map(p => [p.lookup_key, p]));

    function buildPack(lookupKey: string, fallbackName: string) {
      const price = priceMap.get(lookupKey);
      if (!price) return null;

      const productName = typeof price.product === 'object'
        ? price.product.name
        : fallbackName;

      return {
        priceId: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        displayPrice: formatPrice(price.unit_amount, price.currency),
        productName,
        credits: CREDITS[lookupKey] || 0,
      };
    }

    const response: Record<string, any> = {};

    const starter = buildPack(LOOKUP_KEYS.credits.starter, 'Starter Pack');
    if (starter) response.starter = starter;

    const popular = buildPack(LOOKUP_KEYS.credits.popular, 'Popular Pack');
    if (popular) response.popular = popular;

    const bestValue = buildPack(LOOKUP_KEYS.credits.best_value, 'Best Value Pack');
    if (bestValue) response.best_value = bestValue;

    console.log('[get-credit-prices] Returning prices:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-credit-prices] Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch credit prices',
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
