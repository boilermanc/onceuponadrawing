import { LOOKUP_KEYS, getPriceByLookupKey } from '../_shared/stripe-pricing.ts';

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
  productType: 'softcover' | 'hardcover' | 'ebook'
  dedicationText?: string

  // Cover customization
  coverColorId?: string
  textColorId?: string

  // Shipping details (required for physical books)
  shippingAddress?: ShippingAddress
  shipping?: { name: string; address1: string; city: string; state: string; zip: string; phone: string; email: string }
  shippingLevelId?: string // Lulu shipping level code (e.g., "MAIL", "PRIORITY_MAIL")
  shippingCost?: number // Shipping cost in cents

  // Gift order details
  isGift?: boolean
  billingAddress?: BillingAddress // Purchaser's address (for gifts, different from shipping)

  // Pricing (will be calculated if not provided)
  bookCost?: number // Book production cost in cents

  // Stripe redirect URLs (from frontend)
  successUrl?: string
  cancelUrl?: string
}

// Create pending book order in database
async function createBookOrder(params: {
  userId: string
  creationId: string
  orderType: 'ebook' | 'hardcover' | 'softcover'
  dedicationText?: string
  amountPaid: number
  stripeSessionId: string
  shippingAddress?: ShippingAddress
  shippingLevelId?: string
  contactEmail?: string
  isGift?: boolean
  billingAddress?: BillingAddress
  coverColorId?: string
  textColorId?: string
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
    cover_color_id: params.coverColorId || 'soft-blue',
    text_color_id: params.textColorId || 'gunmetal',
  }

  // Add shipping information for physical orders
  if ((params.orderType === 'hardcover' || params.orderType === 'softcover') && params.shippingAddress) {
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

  // Log Stripe mode for debugging (test vs live)
  const stripeMode = STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' :
                     STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN'
  console.log('[create-book-checkout] Stripe mode:', stripeMode)

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
    if (body.productType !== 'ebook' && body.productType !== 'hardcover' && body.productType !== 'softcover') {
      return new Response(JSON.stringify({ error: 'Invalid product type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Normalize shipping from frontend format if needed
    let resolvedShippingAddress: ShippingAddress | undefined = body.shippingAddress
    if (!resolvedShippingAddress && body.shipping) {
      resolvedShippingAddress = {
        name: body.shipping.name,
        street1: body.shipping.address1,
        city: body.shipping.city,
        stateCode: body.shipping.state,
        postalCode: body.shipping.zip,
        countryCode: 'US',
        phoneNumber: body.shipping.phone,
        email: body.shipping.email,
      }
    }

    // For physical books, validate shipping information
    const isPhysical = body.productType === 'hardcover' || body.productType === 'softcover'
    if (isPhysical && !resolvedShippingAddress) {
      return new Response(JSON.stringify({
        error: 'Physical book orders require a shipping address'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve price via lookup key
    const lookupKeyMap: Record<string, string> = {
      ebook: LOOKUP_KEYS.books.digital,
      softcover: LOOKUP_KEYS.books.softcover,
      hardcover: LOOKUP_KEYS.books.hardcover,
    };
    const lookupKey = lookupKeyMap[body.productType];
    console.log('[create-book-checkout] Fetching price for lookup key:', lookupKey);

    let totalAmount: number
    let description: string
    let resolvedPriceId: string | undefined

    try {
      const stripePrice = await getPriceByLookupKey(lookupKey);
      resolvedPriceId = stripePrice.id;
      totalAmount = stripePrice.unit_amount;

      if (isPhysical) {
        // Add shipping cost on top of book price
        totalAmount += (body.shippingCost || 0);
      }

      description = body.productType === 'ebook'
        ? 'Once Upon a Drawing - eBook'
        : body.productType === 'softcover'
          ? 'Once Upon a Drawing - Softcover Book'
          : 'Once Upon a Drawing - Hardcover Book'
    } catch (err) {
      console.error('[create-book-checkout] Failed to fetch price by lookup key, using fallback:', err);
      // Fallback: book cost + shipping cost
      totalAmount = (body.bookCost || 0) + (body.shippingCost || 0);
      description = body.productType === 'softcover'
        ? 'Once Upon a Drawing - Softcover Book'
        : body.productType === 'hardcover'
          ? 'Once Upon a Drawing - Hardcover Book'
          : 'Once Upon a Drawing - eBook'
    }

    console.log('[create-book-checkout] Total amount:', totalAmount, 'cents')

    // Build redirect URLs - use frontend-provided URLs or fallback to defaults
    const successUrl = body.successUrl
      ? `${body.successUrl}?session_id={CHECKOUT_SESSION_ID}`
      : `${DEFAULT_BASE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = body.cancelUrl || `${DEFAULT_BASE_URL}/order-cancelled`

    console.log('[create-book-checkout] Redirect URLs:', {
      successUrl,
      cancelUrl,
      providedSuccessUrl: body.successUrl,
      providedCancelUrl: body.cancelUrl,
    })

    // Build checkout session params — always use dynamic price_data so we can
    // include shipping in the total amount
    let sessionParams: any = {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: body.userEmail,
    }

    sessionParams.line_items = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: description,
          description: isPhysical
            ? `Includes book printing and ${body.shippingLevelId || 'standard'} shipping`
            : 'Digital PDF book',
        },
        unit_amount: totalAmount,
      },
      quantity: 1,
    }]

    // Add metadata
    sessionParams.metadata = {
      user_id: body.userId,
      creation_id: body.creationId,
      product_type: body.productType,
      dedication_text: body.dedicationText || '',
      cover_color_id: body.coverColorId || 'soft-blue',
      text_color_id: body.textColorId || 'gunmetal',
      order_source: 'book_checkout',
    }

    if (isPhysical) {
      sessionParams.metadata.shipping_level_id = body.shippingLevelId || 'MAIL'
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

    // Add line items (always dynamic price_data)
    formBody.append('line_items[0][price_data][currency]', 'usd')
    formBody.append('line_items[0][price_data][product_data][name]', description)
    formBody.append('line_items[0][price_data][product_data][description]', sessionParams.line_items[0].price_data.product_data.description)
    formBody.append('line_items[0][price_data][unit_amount]', totalAmount.toString())
    formBody.append('line_items[0][quantity]', '1')

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
    console.log('[create-book-checkout] Checkout session created:', {
      sessionId: session.id,
      sessionUrl: session.url,
      mode: session.mode,
      paymentStatus: session.payment_status,
      successUrl: session.success_url,
      cancelUrl: session.cancel_url,
    })

    // Create pending book order in database
    console.log('[create-book-checkout] Creating book order in database...')
    const bookOrder = await createBookOrder({
      userId: body.userId,
      creationId: body.creationId,
      orderType: body.productType === 'softcover' ? 'softcover' : body.productType,
      dedicationText: body.dedicationText,
      amountPaid: totalAmount,
      stripeSessionId: session.id,
      shippingAddress: resolvedShippingAddress,
      shippingLevelId: body.shippingLevelId || 'MAIL',
      contactEmail: 'team@sproutify.app', // Always use team email for Lulu order issues
      isGift: body.isGift,
      billingAddress: body.billingAddress,
      coverColorId: body.coverColorId || 'soft-blue',
      textColorId: body.textColorId || 'gunmetal',
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
