const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decode JWT to get user info (Supabase has already validated it)
function decodeJwt(token: string): { id: string; email?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
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

interface CreateBookCheckoutRequest {
  priceId: string
  productType: 'ebook' | 'hardcover'
  userId: string
  creationId: string
  dedicationText?: string
  userEmail: string
}

interface StripePrice {
  id: string
  unit_amount: number
  currency: string
}

interface StripeCheckoutSession {
  id: string
  url: string
  payment_intent: string
}

// Fetch price details from Stripe to get the amount
async function getStripePrice(priceId: string): Promise<StripePrice> {
  const response = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch price: ${errorText}`)
  }

  return response.json()
}

// Create Stripe Checkout Session
async function createStripeCheckoutSession(params: {
  priceId: string
  successUrl: string
  cancelUrl: string
  customerEmail: string
  metadata: Record<string, string>
}): Promise<StripeCheckoutSession> {
  const body = new URLSearchParams({
    'payment_method_types[]': 'card',
    'line_items[0][price]': params.priceId,
    'line_items[0][quantity]': '1',
    'mode': 'payment',
    'success_url': params.successUrl,
    'cancel_url': params.cancelUrl,
    'customer_email': params.customerEmail,
  })

  // Add metadata
  for (const [key, value] of Object.entries(params.metadata)) {
    body.append(`metadata[${key}]`, value)
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[create-book-checkout] Stripe API error:', response.status, errorText)
    throw new Error(`Stripe API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

// Create pending book order in database
async function createBookOrder(params: {
  userId: string
  creationId: string
  orderType: 'ebook' | 'hardcover'
  dedicationText?: string
  amountPaid: number
  stripeSessionId: string
}): Promise<{ id: string }> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/book_orders`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: params.userId,
        creation_id: params.creationId,
        order_type: params.orderType,
        status: 'pending',
        dedication_text: params.dedicationText || null,
        amount_paid: params.amountPaid,
        stripe_session_id: params.stripeSessionId,
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[create-book-checkout] Failed to create book order:', errorText)
    throw new Error(`Failed to create book order: ${errorText}`)
  }

  const orders = await response.json()
  return orders[0]
}

Deno.serve(async (req) => {
  console.log('[create-book-checkout] Request received:', req.method)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Validate auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user, error: userError } = getUser(authHeader)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: CreateBookCheckoutRequest = await req.json()
    console.log('[create-book-checkout] Request body:', {
      priceId: body.priceId,
      productType: body.productType,
      userId: body.userId,
      creationId: body.creationId,
      userEmail: body.userEmail,
    })

    // Validate required fields
    if (!body.priceId || !body.productType || !body.userId || !body.creationId || !body.userEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Security: Ensure userId matches authenticated user
    if (body.userId !== user.id) {
      console.error('[create-book-checkout] User ID mismatch:', { bodyUserId: body.userId, authUserId: user.id })
      return new Response(JSON.stringify({ error: 'User ID mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate productType
    if (body.productType !== 'ebook' && body.productType !== 'hardcover') {
      return new Response(JSON.stringify({ error: 'Invalid product type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the price amount from Stripe
    console.log('[create-book-checkout] Fetching price from Stripe...')
    const price = await getStripePrice(body.priceId)
    console.log('[create-book-checkout] Price:', price.unit_amount, price.currency)

    // Create Stripe Checkout Session
    console.log('[create-book-checkout] Creating Stripe checkout session...')
    const session = await createStripeCheckoutSession({
      priceId: body.priceId,
      successUrl: 'https://onceuponadrawing.com/order-success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://onceuponadrawing.com/order-cancelled',
      customerEmail: body.userEmail,
      metadata: {
        user_id: body.userId,
        creation_id: body.creationId,
        product_type: body.productType,
        dedication_text: body.dedicationText || '',
        order_source: 'book_checkout',
      },
    })
    console.log('[create-book-checkout] Checkout session created:', session.id)

    // Create pending book order in database
    console.log('[create-book-checkout] Creating book order in database...')
    const bookOrder = await createBookOrder({
      userId: body.userId,
      creationId: body.creationId,
      orderType: body.productType,
      dedicationText: body.dedicationText,
      amountPaid: price.unit_amount,
      stripeSessionId: session.id,
    })
    console.log('[create-book-checkout] Book order created:', bookOrder.id)

    return new Response(JSON.stringify({
      url: session.url,
      orderId: bookOrder.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[create-book-checkout] Error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to create checkout session',
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
