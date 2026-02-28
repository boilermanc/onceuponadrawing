import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { LOOKUP_KEYS, getPricesByLookupKeys, formatPrice, StripePrice } from '../_shared/stripe-pricing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Fetch prices and availability in parallel
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const [prices, availabilityResult] = await Promise.all([
      getPricesByLookupKeys([
        LOOKUP_KEYS.books.digital,
        LOOKUP_KEYS.books.softcover,
        LOOKUP_KEYS.books.hardcover,
      ]),
      supabaseClient
        .from('config_settings')
        .select('key, value, data_type')
        .eq('category', 'products')
        .in('key', ['ebook_enabled', 'softcover_enabled', 'hardcover_enabled']),
    ])

    const priceMap = new Map<string, StripePrice>(prices.map(p => [p.lookup_key, p]));

    // Parse availability flags (default to true if not found)
    const availabilityMap: Record<string, boolean> = {}
    for (const row of availabilityResult.data || []) {
      availabilityMap[row.key] = row.value === 'true' || row.value === '1'
    }

    const response: Record<string, any> = {
      availability: {
        ebook: availabilityMap.ebook_enabled ?? true,
        softcover: availabilityMap.softcover_enabled ?? true,
        hardcover: availabilityMap.hardcover_enabled ?? true,
      },
    };

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
