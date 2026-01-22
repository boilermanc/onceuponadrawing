const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

const BOOK_PRICE_IDS = {
  ebook: 'price_1SsRkzGzopxGCjLeKjAifMlZ',
  // hardcover: 'price_xxx' // Add later
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
    // Fetch ebook price from Stripe
    const ebookPrice = await getStripePrice(BOOK_PRICE_IDS.ebook)

    const productName = typeof ebookPrice.product === 'object'
      ? ebookPrice.product.name
      : 'Digital Storybook'

    const response = {
      ebook: {
        priceId: ebookPrice.id,
        amount: ebookPrice.unit_amount,
        currency: ebookPrice.currency,
        displayPrice: formatPrice(ebookPrice.unit_amount, ebookPrice.currency),
        productName: productName,
      },
      hardcover: null, // We'll add this later
    }

    console.log('[get-book-prices] Returning prices:', response)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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
