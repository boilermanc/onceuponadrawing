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

      const userId = session.client_reference_id || session.metadata?.user_id
      const packName = session.metadata?.pack_name
      const credits = parseInt(session.metadata?.credits || '0', 10)

      console.log('[stripe-webhook] Processing:', { userId, packName, credits })

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
