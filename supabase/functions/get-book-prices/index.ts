import { LOOKUP_KEYS, getPricesByLookupKeys, formatPrice, StripePrice } from '../_shared/stripe-pricing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildPriceResponse(price: StripePrice, fallbackName: string) {
  const productName = typeof price.product === 'object'
    ? price.product.name
    : fallbackName;

  return {
    priceId: price.id,
    amount: price.unit_amount,
    currency: price.currency,
    displayPrice: formatPrice(price.unit_amount, price.currency),
    productName,
  };
}

Deno.serve(async (req) => {
  console.log('[get-book-prices] Request received:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const lookupKeys = [
      LOOKUP_KEYS.books.digital,
      LOOKUP_KEYS.books.softcover,
      LOOKUP_KEYS.books.hardcover,
    ];

    const prices = await getPricesByLookupKeys(lookupKeys);
    const priceMap = new Map<string, StripePrice>(prices.map(p => [p.lookup_key, p]));

    const response: Record<string, any> = {};

    const ebookPrice = priceMap.get(LOOKUP_KEYS.books.digital);
    if (ebookPrice) {
      response.ebook = buildPriceResponse(ebookPrice, 'Digital Storybook');
    }

    const softcoverPrice = priceMap.get(LOOKUP_KEYS.books.softcover);
    if (softcoverPrice) {
      response.softcover = buildPriceResponse(softcoverPrice, 'Softcover Book');
    }

    const hardcoverPrice = priceMap.get(LOOKUP_KEYS.books.hardcover);
    if (hardcoverPrice) {
      response.hardcover = buildPriceResponse(hardcoverPrice, 'Hardcover Book');
    }

    console.log('[get-book-prices] Returning prices:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-book-prices] Error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch prices',
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
