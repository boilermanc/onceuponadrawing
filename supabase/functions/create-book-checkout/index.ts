const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEFAULT_BASE_URL = 'https://onceuponadrawing.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

interface ShippingAddress {
  name: string
  street1: string
  street2?: string
  city: string
  stateCode: string
  postalCode: string
  countryCode: string
  phoneNumber?: string
  email?: string
}

interface BillingAddress {
  name: string
  street1: string
  street2?: string
  city: string
  stateCode: string
  postalCode: string
  countryCode: string
}

interface CreateBookCheckoutRequest {
  // Order details
  creationId: string
  userId: string
  userEmail: string
  productType: 'ebook' | 'hardcover'
  dedicationText?: string

  // Shipping details (required for hardcover)
  shippingAddress?: ShippingAddress
  shippingLevelId?: string // Lulu shipping level code (e.g., "MAIL", "PRIORITY_MAIL")
  shippingCost?: number // Shipping cost in cents

  // Gift order details
  isGift?: boolean
  billingAddress?: BillingAddress // Purchaser's address (for gifts, different from shipping)

  // Pricing (will be calculated if not provided)
  priceId?: string // Optional - we can create dynamic price
  bookCost?: number // Book production cost in cents

  // Stripe redirect URLs (from frontend)
  successUrl?: string
  cancelUrl?: string
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
    'locale': 'en',
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
  shippingAddress?: ShippingAddress
  shippingLevelId?: string
  contactEmail?: string
  isGift?: boolean
  billingAddress?: BillingAddress
}): Promise<{ id: string }> {
  const orderData: any = {
    user_id: params.userId,
    creation_id: params.creationId,
    order_type: params.orderType,
    status: 'pending',
    dedication_text: params.dedicationText || null,
    amount_paid: params.amountPaid,
    stripe_session_id: params.stripeSessionId,
    contact_email: params.contactEmail || null,
    is_gift: params.isGift || false,
  }

  // Add shipping information for hardcover orders
  if (params.orderType === 'hardcover' && params.shippingAddress) {
    orderData.shipping_name = params.shippingAddress.name
    orderData.shipping_address = params.shippingAddress.street1
    orderData.shipping_address2 = params.shippingAddress.street2 || null
    orderData.shipping_city = params.shippingAddress.city
    orderData.shipping_state = params.shippingAddress.stateCode
    orderData.shipping_zip = params.shippingAddress.postalCode
    orderData.shipping_country = params.shippingAddress.countryCode || 'US'
    orderData.shipping_phone = params.shippingAddress.phoneNumber || null
    orderData.shipping_email = params.shippingAddress.email || null
    orderData.shipping_level_id = params.shippingLevelId || null
  }

  // Add billing address (purchaser's address)
  if (params.billingAddress) {
    orderData.billing_name = params.billingAddress.name
    orderData.billing_street1 = params.billingAddress.street1
    orderData.billing_street2 = params.billingAddress.street2 || null
    orderData.billing_city = params.billingAddress.city
    orderData.billing_state = params.billingAddress.stateCode
    orderData.billing_zip = params.billingAddress.postalCode
    orderData.billing_country = params.billingAddress.countryCode || 'US'
  }

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
      body: JSON.stringify(orderData),
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
      productType: body.productType,
      userId: body.userId,
      creationId: body.creationId,
      userEmail: body.userEmail,
      hasShipping: !!body.shippingAddress,
      shippingLevelId: body.shippingLevelId,
      isGift: body.isGift,
      hasBilling: !!body.billingAddress,
    })

    // Validate required fields
    if (!body.productType || !body.userId || !body.creationId || !body.userEmail) {
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

    // For hardcover, validate shipping information
    if (body.productType === 'hardcover') {
      if (!body.shippingAddress || !body.shippingLevelId || body.shippingCost === undefined || body.bookCost === undefined) {
        return new Response(JSON.stringify({ 
          error: 'Hardcover orders require shipping address, shipping level, shipping cost, and book cost' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Calculate total amount
    let totalAmount: number
    let description: string
    
    if (body.productType === 'ebook') {
      totalAmount = 1299 // $12.99 for ebook
      description = 'Once Upon a Drawing - eBook'
    } else {
      // Hardcover: book cost + shipping cost
      totalAmount = (body.bookCost || 0) + (body.shippingCost || 0)
      description = `Once Upon a Drawing - Hardcover Book`
    }

    console.log('[create-book-checkout] Total amount:', totalAmount, 'cents')

    // Build redirect URLs - use frontend-provided URLs or fallback to defaults
    const successUrl = body.successUrl
      ? `${body.successUrl}?session_id={CHECKOUT_SESSION_ID}`
      : `${DEFAULT_BASE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = body.cancelUrl || `${DEFAULT_BASE_URL}/order-cancelled`

    // If priceId provided, use it; otherwise create inline price
    let sessionParams: any = {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: body.userEmail,
    }

    if (body.priceId) {
      // Use existing price
      sessionParams.line_items = [{
        price: body.priceId,
        quantity: 1,
      }]
    } else {
      // Create dynamic price inline
      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: description,
            description: body.productType === 'hardcover' 
              ? `Includes book printing and ${body.shippingLevelId} shipping`
              : 'Digital PDF book',
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      }]
    }

    // Add metadata
    sessionParams.metadata = {
      user_id: body.userId,
      creation_id: body.creationId,
      product_type: body.productType,
      dedication_text: body.dedicationText || '',
      order_source: 'book_checkout',
    }

    if (body.productType === 'hardcover') {
      sessionParams.metadata.shipping_level_id = body.shippingLevelId
      sessionParams.metadata.book_cost = body.bookCost?.toString() || '0'
      sessionParams.metadata.shipping_cost = body.shippingCost?.toString() || '0'
    }

    // Create Stripe Checkout Session using fetch directly for inline prices
    console.log('[create-book-checkout] Creating Stripe checkout session...')
    const formBody = new URLSearchParams()
    formBody.append('mode', sessionParams.mode)
    formBody.append('success_url', sessionParams.success_url)
    formBody.append('cancel_url', sessionParams.cancel_url)
    formBody.append('customer_email', sessionParams.customer_email)
    formBody.append('payment_method_types[0]', 'card')

    // Add line items
    if (body.priceId) {
      formBody.append('line_items[0][price]', body.priceId)
      formBody.append('line_items[0][quantity]', '1')
    } else {
      formBody.append('line_items[0][price_data][currency]', 'usd')
      formBody.append('line_items[0][price_data][product_data][name]', description)
      formBody.append('line_items[0][price_data][product_data][description]', sessionParams.line_items[0].price_data.product_data.description)
      formBody.append('line_items[0][price_data][unit_amount]', totalAmount.toString())
      formBody.append('line_items[0][quantity]', '1')
    }

    // Add metadata
    for (const [key, value] of Object.entries(sessionParams.metadata)) {
      formBody.append(`metadata[${key}]`, value as string)
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    })

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text()
      console.error('[create-book-checkout] Stripe API error:', stripeResponse.status, errorText)
      throw new Error(`Stripe API error (${stripeResponse.status}): ${errorText}`)
    }

    const session = await stripeResponse.json()
    console.log('[create-book-checkout] Checkout session created:', session.id)

    // Create pending book order in database
    console.log('[create-book-checkout] Creating book order in database...')
    const bookOrder = await createBookOrder({
      userId: body.userId,
      creationId: body.creationId,
      orderType: body.productType,
      dedicationText: body.dedicationText,
      amountPaid: totalAmount,
      stripeSessionId: session.id,
      shippingAddress: body.shippingAddress,
      shippingLevelId: body.shippingLevelId,
      contactEmail: 'team@sproutify.app', // Always use team email for Lulu order issues
      isGift: body.isGift,
      billingAddress: body.billingAddress,
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
