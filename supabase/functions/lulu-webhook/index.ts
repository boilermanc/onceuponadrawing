/**
 * Lulu Webhook Handler
 *
 * Receives order status updates from Lulu Print API
 * Topic: PRINT_JOB_STATUS_CHANGED
 *
 * Lulu Status Values:
 * - CREATED, UNPAID, PAYMENT_IN_PROGRESS, PRODUCTION_DELAYED
 * - PRODUCTION_READY, IN_PRODUCTION, SHIPPED
 * - REJECTED, CANCELED, ERROR
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Use the appropriate secret based on environment
const LULU_USE_SANDBOX = Deno.env.get('LULU_USE_SANDBOX');
const LULU_SANDBOX_CLIENT_SECRET = Deno.env.get('LULU_SANDBOX_CLIENT_SECRET')!;
const LULU_PRODUCTION_CLIENT_SECRET = Deno.env.get('LULU_PRODUCTION_CLIENT_SECRET')!;

function getLuluSecret(): string {
  const useSandbox = LULU_USE_SANDBOX !== 'false';
  return useSandbox ? LULU_SANDBOX_CLIENT_SECRET : LULU_PRODUCTION_CLIENT_SECRET;
}

// Lulu webhook payload structure
interface LuluWebhookPayload {
  topic: 'PRINT_JOB_STATUS_CHANGED';
  data: LuluPrintJob;
}

interface LuluPrintJob {
  id: number;
  status: {
    name: LuluStatus;
    message?: string;
  };
  line_items: Array<{
    id: number;
    external_id?: string; // Our book_order ID
    status: {
      name: string;
    };
    tracking_id?: string;
    tracking_urls?: string[];
    carrier_name?: string;
  }>;
  date_created: string;
  date_modified: string;
}

type LuluStatus =
  | 'CREATED'
  | 'UNPAID'
  | 'PAYMENT_IN_PROGRESS'
  | 'PRODUCTION_DELAYED'
  | 'PRODUCTION_READY'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'REJECTED'
  | 'CANCELED'
  | 'ERROR';

// Map Lulu status to our book_orders status
function mapLuluStatusToOrderStatus(luluStatus: LuluStatus): string {
  switch (luluStatus) {
    case 'CREATED':
    case 'UNPAID':
    case 'PAYMENT_IN_PROGRESS':
    case 'PRODUCTION_DELAYED':
      return 'processing';
    case 'PRODUCTION_READY':
    case 'IN_PRODUCTION':
      return 'printed';
    case 'SHIPPED':
      return 'shipped';
    case 'REJECTED':
    case 'CANCELED':
    case 'ERROR':
      return 'cancelled';
    default:
      return 'processing';
  }
}

/**
 * Verify Lulu webhook HMAC signature
 * "HMAC is calculated with API secret as a key (UTF-8 encoded),
 * payload as a message (UTF-8 encoded) and SHA-256 as hash function."
 */
async function verifyLuluSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    // Convert to hex
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (computedSignature.length !== signature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error('[lulu-webhook] Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  console.log('[lulu-webhook] Request received:', req.method);

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.text();
    console.log('[lulu-webhook] Body received, length:', body.length);

    // Get HMAC signature from header
    const signature = req.headers.get('Lulu-HMAC-SHA256');

    if (!signature) {
      console.error('[lulu-webhook] No signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify signature
    const secret = getLuluSecret();
    const isValid = await verifyLuluSignature(body, signature, secret);

    if (!isValid) {
      console.error('[lulu-webhook] Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[lulu-webhook] Signature verified');

    // Parse payload
    const payload: LuluWebhookPayload = JSON.parse(body);
    console.log('[lulu-webhook] Topic:', payload.topic);
    console.log('[lulu-webhook] Print job ID:', payload.data.id);
    console.log('[lulu-webhook] Status:', payload.data.status.name);

    if (payload.topic !== 'PRINT_JOB_STATUS_CHANGED') {
      console.log('[lulu-webhook] Ignoring unknown topic:', payload.topic);
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const printJob = payload.data;
    const luluOrderId = printJob.id.toString();
    const newStatus = mapLuluStatusToOrderStatus(printJob.status.name);

    console.log('[lulu-webhook] Lulu order ID:', luluOrderId);
    console.log('[lulu-webhook] Mapped status:', newStatus);

    // Extract tracking info from line items if available
    let trackingNumber: string | null = null;
    let trackingUrl: string | null = null;

    for (const lineItem of printJob.line_items) {
      if (lineItem.tracking_id) {
        trackingNumber = lineItem.tracking_id;
      }
      if (lineItem.tracking_urls && lineItem.tracking_urls.length > 0) {
        trackingUrl = lineItem.tracking_urls[0];
      }
    }

    console.log('[lulu-webhook] Tracking:', { trackingNumber, trackingUrl });

    // Build update object
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (trackingNumber) {
      updateData.tracking_number = trackingNumber;
    }
    if (trackingUrl) {
      updateData.tracking_url = trackingUrl;
    }

    // Update book_orders by lulu_order_id
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/book_orders?lulu_order_id=eq.${luluOrderId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[lulu-webhook] Failed to update order:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to update order' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedOrders = await updateResponse.json();

    if (!updatedOrders || updatedOrders.length === 0) {
      console.warn('[lulu-webhook] No order found for Lulu order ID:', luluOrderId);
      // Return 200 anyway - Lulu might send webhooks for orders we don't have
      return new Response(JSON.stringify({ received: true, orderNotFound: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bookOrder = updatedOrders[0];
    console.log('[lulu-webhook] Order updated:', {
      bookOrderId: bookOrder.id,
      newStatus: bookOrder.status,
      trackingNumber: bookOrder.tracking_number,
    });

    // TODO: Send email notification to customer when status changes to shipped
    // Could trigger a send-email function here

    return new Response(JSON.stringify({
      received: true,
      bookOrderId: bookOrder.id,
      status: bookOrder.status,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[lulu-webhook] Error:', error);
    return new Response(JSON.stringify({
      error: 'Webhook processing failed',
      details: String(error),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
