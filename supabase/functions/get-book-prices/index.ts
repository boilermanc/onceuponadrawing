const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

const BOOK_PRICE_IDS = {
  ebook: 'price_1SsRkzGzopxGCjLeKjAifMlZ',
  softcover: 'price_SOFTCOVER_ID', // TODO: Replace with actual Stripe price ID
  hardcover: 'price_HARDCOVER_ID', // TODO: Replace with actual Stripe price ID
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StripePriceResponse {
  id: string
  unit_amount: number
  currency: string
  product: string | { name: string }
}

interface StripeProductResponse {
  id: string
  name: string
}

async function getStripePrice(priceId: string): Promise<StripePriceResponse> {
  const response = await fetch(`https://api.stripe.com/v1/prices/${priceId}?expand[]=product`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[get-book-prices] Stripe API error:', response.status, errorText)
    throw new Error(`Stripe API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

function formatPrice(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  })
  return formatter.format(amount / 100)
}

Deno.serve(async (req) => {
  console.log('[get-book-prices] Request received:', req.method)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Fetch all prices from Stripe in parallel
    const [ebookPrice, softcoverPrice, hardcoverPrice] = await Promise.all([
      getStripePrice(BOOK_PRICE_IDS.ebook).catch(err => {
        console.error('[get-book-prices] Failed to fetch ebook price:', err);
        return null;
      }),
      getStripePrice(BOOK_PRICE_IDS.softcover).catch(err => {
        console.error('[get-book-prices] Failed to fetch softcover price:', err);
        return null;
      }),
      getStripePrice(BOOK_PRICE_IDS.hardcover).catch(err => {
        console.error('[get-book-prices] Failed to fetch hardcover price:', err);
        return null;
      }),
    ]);

    const response: any = {};

    // Add ebook if available
    if (ebookPrice) {
      const productName = typeof ebookPrice.product === 'object'
        ? ebookPrice.product.name
        : 'Digital Storybook';

      response.ebook = {
        priceId: ebookPrice.id,
        amount: ebookPrice.unit_amount,
        currency: ebookPrice.currency,
        displayPrice: formatPrice(ebookPrice.unit_amount, ebookPrice.currency),
        productName: productName,
      };
    }

    // Add softcover if available
    if (softcoverPrice) {
      const productName = typeof softcoverPrice.product === 'object'
        ? softcoverPrice.product.name
        : 'Softcover Book';

      response.softcover = {
        priceId: softcoverPrice.id,
        amount: softcoverPrice.unit_amount,
        currency: softcoverPrice.currency,
        displayPrice: formatPrice(softcoverPrice.unit_amount, softcoverPrice.currency),
        productName: productName,
      };
    }

    // Add hardcover if available
    if (hardcoverPrice) {
      const productName = typeof hardcoverPrice.product === 'object'
        ? hardcoverPrice.product.name
        : 'Hardcover Book';

      response.hardcover = {
        priceId: hardcoverPrice.id,
        amount: hardcoverPrice.unit_amount,
        currency: hardcoverPrice.currency,
        displayPrice: formatPrice(hardcoverPrice.unit_amount, hardcoverPrice.currency),
        productName: productName,
      };
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
