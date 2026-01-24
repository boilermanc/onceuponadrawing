const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

const PRICE_IDS: Record<string, string> = {
  starter: 'price_1Ss3YsGzopxGCjLeYPAjs6Mz',
  popular: 'price_1Ss3YsGzopxGCjLeYPAjs6Mz',  // same for now, update later
  best_value: 'price_1Ss3YsGzopxGCjLeYPAjs6Mz',  // same for now, update later
}

const CREDITS: Record<string, number> = {
  starter: 3,
  popular: 5,
  best_value: 10,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decode JWT to get user info (Supabase has already validated it)
function decodeJwt(token: string): { id: string; email?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode the payload (second part)
    const payload = parts[1]
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const jsonStr = atob(base64)
    const decoded = JSON.parse(jsonStr)

    return {
      id: decoded.sub,
      email: decoded.email,
    }
  } catch {
    return null
  }
}

function getUser(authHeader: string) {
  const token = authHeader.replace('Bearer ', '')
  const user = decodeJwt(token)

  if (!user) {
    return { user: null, error: 'Invalid token' }
  }

  return { user, error: null }
}

// Use fetch-based Stripe API calls
async function createStripeCheckoutSession(params: {
  priceId: string
  successUrl: string
  cancelUrl: string
  clientReferenceId: string
  customerEmail: string
  metadata: Record<string, string>
}) {
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': params.priceId,
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': params.successUrl,
      'cancel_url': params.cancelUrl,
      'client_reference_id': params.clientReferenceId,
      'customer_email': params.customerEmail,
      'locale': 'en',
      'metadata[user_id]': params.metadata.user_id,
      'metadata[pack_name]': params.metadata.pack_name,
      'metadata[credits]': params.metadata.credits,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[create-checkout] Stripe API error:', response.status, errorText)
    throw new Error(`Stripe API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

Deno.serve(async (req) => {
  console.log('[create-checkout] Request received:', req.method)
  console.log('[create-checkout] STRIPE_SECRET_KEY exists:', !!STRIPE_SECRET_KEY)
  console.log('[create-checkout] STRIPE_SECRET_KEY prefix:', STRIPE_SECRET_KEY?.substring(0, 7))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    console.log('[create-checkout] Auth header exists:', !!authHeader)

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user, error: userError } = getUser(authHeader)
    console.log('[create-checkout] User:', user?.id)
    console.log('[create-checkout] User error:', userError)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { pack, success_url, cancel_url } = await req.json()
    console.log('[create-checkout] Pack:', pack)

    if (!pack || !PRICE_IDS[pack]) {
      return new Response(JSON.stringify({ error: 'Invalid pack' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[create-checkout] Creating Stripe session with:', {
      priceId: PRICE_IDS[pack],
      userId: user.id,
      email: user.email,
    })

    const session = await createStripeCheckoutSession({
      priceId: PRICE_IDS[pack],
      successUrl: success_url || 'https://onceuponadrawing.com/purchase-success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: cancel_url || 'https://onceuponadrawing.com/',
      clientReferenceId: user.id,
      customerEmail: user.email || '',
      metadata: {
        user_id: user.id,
        pack_name: pack,
        credits: CREDITS[pack].toString(),
      },
    })

    console.log('[create-checkout] Checkout session created:', session.id, session.url)

    return new Response(JSON.stringify({ checkout_url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[create-checkout] Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to create checkout session', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
