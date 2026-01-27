const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PACK_PRICES: Record<string, number> = {
  starter: 1299,
  popular: 1999,
  best_value: 3499,
}

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = signature.split(',')
  const timestampPart = parts.find(p => p.startsWith('t='))
  const signaturePart = parts.find(p => p.startsWith('v1='))

  if (!timestampPart || !signaturePart) {
    return false
  }

  const timestamp = timestampPart.split('=')[1]
  const expectedSignature = signaturePart.split('=')[1]

  // Create the signed payload
  const signedPayload = `${timestamp}.${payload}`

  // Compute HMAC
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  )

  // Convert to hex
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedSignature === expectedSignature
}

// Handle book order after successful payment
async function handleBookOrder(session: any): Promise<Response> {
  try {
    const stripeSessionId = session.id
    console.log('[stripe-webhook] Handling book order for session:', stripeSessionId)

    // Update book order status to payment_received
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/book_orders?stripe_session_id=eq.${stripeSessionId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          status: 'payment_received',
          stripe_payment_intent_id: session.payment_intent,
        }),
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('[stripe-webhook] Failed to update book order:', errorText)
      return new Response('Failed to update book order', { status: 500 })
    }

    const updatedOrders = await updateResponse.json()
    if (!updatedOrders || updatedOrders.length === 0) {
      console.error('[stripe-webhook] No book order found for session:', stripeSessionId)
      return new Response('Book order not found', { status: 404 })
    }

    const bookOrder = updatedOrders[0]
    console.log('[stripe-webhook] Book order updated:', bookOrder.id)

    // Fetch creation details for the email
    let creationTitle = 'Your Story'
    let artistName = 'Young Artist'
    try {
      const creationResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/creations?id=eq.${bookOrder.creation_id}&select=title,artist_name`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      )
      if (creationResponse.ok) {
        const creations = await creationResponse.json()
        if (creations && creations.length > 0) {
          creationTitle = creations[0].title || 'Your Story'
          artistName = creations[0].artist_name || 'Young Artist'
        }
      }
    } catch (err) {
      console.error('[stripe-webhook] Failed to fetch creation details:', err)
    }

    // Send book order confirmation email (fire and forget)
    const recipientEmail = bookOrder.shipping_email || bookOrder.contact_email || session.customer_email
    if (recipientEmail) {
      // Format shipping address for email
      const shippingAddressLines: string[] = []
      if (bookOrder.order_type === 'hardcover') {
        if (bookOrder.shipping_name) shippingAddressLines.push(bookOrder.shipping_name)
        if (bookOrder.shipping_address) shippingAddressLines.push(bookOrder.shipping_address)
        if (bookOrder.shipping_address2) shippingAddressLines.push(bookOrder.shipping_address2)
        const cityStateZip = [
          bookOrder.shipping_city,
          bookOrder.shipping_state,
          bookOrder.shipping_zip,
        ].filter(Boolean).join(', ')
        if (cityStateZip) shippingAddressLines.push(cityStateZip)
        if (bookOrder.shipping_country && bookOrder.shipping_country !== 'US') {
          shippingAddressLines.push(bookOrder.shipping_country)
        }
      }

      // Determine which template to use based on gift status
      const isGiftOrder = bookOrder.is_gift === true
      const templateKey = isGiftOrder ? 'book_order_confirmation_gift' : 'book_order_confirmation'

      fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_key: templateKey,
          recipient_email: recipientEmail,
          variables: {
            customer_name: bookOrder.billing_name || bookOrder.shipping_name || 'Friend',
            recipient_name: bookOrder.shipping_name || 'the recipient',
            order_id: bookOrder.id.slice(0, 8).toUpperCase(),
            book_title: creationTitle,
            artist_name: artistName,
            product_type: bookOrder.order_type === 'hardcover' ? 'Hardcover Book' : 'Digital eBook',
            is_hardcover: bookOrder.order_type === 'hardcover' ? 'true' : 'false',
            is_gift: isGiftOrder ? 'true' : 'false',
            amount_paid: `$${(bookOrder.amount_paid / 100).toFixed(2)}`,
            shipping_address: shippingAddressLines.join('<br>'),
            estimated_delivery: '7-10 business days',
            order_status_url: `https://onceuponadrawing.com/order-success?session_id=${session.id}`,
          },
          book_order_id: bookOrder.id,
        }),
      }).catch(err => {
        console.error('[stripe-webhook] Failed to send book order confirmation email:', err)
      })
      console.log('[stripe-webhook] Book order confirmation email triggered:', templateKey)
    }

    // Route to the correct processing function based on order type
    console.log('[stripe-webhook] Triggering book processing for order type:', bookOrder.order_type)

    if (bookOrder.order_type === 'ebook') {
      // Ebook: generate PDF and deliver download link
      fetch(`${SUPABASE_URL}/functions/v1/process-ebook-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookOrderId: bookOrder.id,
        }),
      }).catch(err => {
        console.error('[stripe-webhook] Failed to trigger ebook processing:', err)
      })
    } else {
      // Physical book: generate PDFs and submit to Lulu
      fetch(`${SUPABASE_URL}/functions/v1/process-book-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookOrderId: bookOrder.id,
        }),
      }).catch(err => {
        console.error('[stripe-webhook] Failed to trigger book processing:', err)
      })
    }

    console.log('[stripe-webhook] Book order webhook processed successfully')
    return new Response(JSON.stringify({ received: true, bookOrderId: bookOrder.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[stripe-webhook] Error handling book order:', error)
    return new Response(`Book order error: ${String(error)}`, { status: 500 })
  }
}

Deno.serve(async (req) => {
  console.log('[stripe-webhook] Request received')

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.error('[stripe-webhook] No signature')
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    console.log('[stripe-webhook] Body received, length:', body.length)

    // Verify signature
    const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)
    if (!isValid) {
      console.error('[stripe-webhook] Invalid signature')
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(body)
    console.log('[stripe-webhook] Event type:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Check if this is a book order or credit purchase
      const orderSource = session.metadata?.order_source

      if (orderSource === 'book_checkout') {
        // Handle book order
        console.log('[stripe-webhook] Processing book order')
        return await handleBookOrder(session)
      }

      // Handle credit purchase (existing logic)
      const userId = session.client_reference_id || session.metadata?.user_id
      const packName = session.metadata?.pack_name
      const credits = parseInt(session.metadata?.credits || '0', 10)

      console.log('[stripe-webhook] Processing credit purchase:', { userId, packName, credits })

      if (!userId || !packName || !credits) {
        console.error('[stripe-webhook] Missing metadata:', { userId, packName, credits })
        return new Response('Missing metadata', { status: 400 })
      }

      // Get current balance using service role
      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=credit_balance`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      )

      if (!profileResponse.ok) {
        console.error('[stripe-webhook] Profile fetch error:', await profileResponse.text())
        return new Response('Profile not found', { status: 400 })
      }

      const profiles = await profileResponse.json()
      if (!profiles || profiles.length === 0) {
        console.error('[stripe-webhook] No profile found for user:', userId)
        return new Response('Profile not found', { status: 400 })
      }

      const currentBalance = profiles[0].credit_balance || 0
      const newBalance = currentBalance + credits

      console.log('[stripe-webhook] Updating balance:', { currentBalance, credits, newBalance })

      // Update profile balance
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ credit_balance: newBalance }),
        }
      )

      if (!updateResponse.ok) {
        console.error('[stripe-webhook] Balance update error:', await updateResponse.text())
        return new Response('Failed to update balance', { status: 500 })
      }

      // Insert transaction record
      const transactionResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/credit_transactions`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            user_id: userId,
            type: 'purchase',
            amount: credits,
            balance_after: newBalance,
            pack_name: packName,
            price_cents: PACK_PRICES[packName] || 0,
            stripe_payment_intent_id: session.payment_intent,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        }
      )

      if (!transactionResponse.ok) {
        console.error('[stripe-webhook] Transaction insert error:', await transactionResponse.text())
        // Don't fail - balance is already updated
      }

      console.log(`[stripe-webhook] Added ${credits} credits to user ${userId}. New balance: ${newBalance}`)

      // Send credit purchase confirmation email (fire and forget)
      const customerEmail = session.customer_email || session.customer_details?.email
      if (customerEmail) {
        const packDisplayName = packName === 'starter' ? 'Starter Pack' :
                               packName === 'popular' ? 'Popular Pack' :
                               packName === 'best_value' ? 'Best Value Pack' : packName

        fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template_key: 'credit_purchase_confirmation',
            recipient_email: customerEmail,
            variables: {
              customer_name: session.customer_details?.name || 'Friend',
              credits_added: credits.toString(),
              new_balance: newBalance.toString(),
              pack_name: packDisplayName,
              amount_paid: `$${((PACK_PRICES[packName] || 0) / 100).toFixed(2)}`,
            },
            user_id: userId,
          }),
        }).catch(err => {
          console.error('[stripe-webhook] Failed to send credit purchase confirmation email:', err)
        })
        console.log('[stripe-webhook] Credit purchase confirmation email triggered')
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[stripe-webhook] Error:', error)
    return new Response(`Webhook error: ${String(error)}`, { status: 400 })
  }
})
