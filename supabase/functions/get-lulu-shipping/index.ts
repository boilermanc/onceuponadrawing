import { LuluConfig, getLuluAccessToken, getShippingRates, ShippingAddress } from '../_shared/lulu-api.ts';
import { LULU_PRODUCT_CODE } from '../_shared/pdf-specs.ts';

const LULU_SANDBOX_CLIENT_KEY = Deno.env.get('LULU_SANDBOX_CLIENT_KEY')!;
const LULU_SANDBOX_CLIENT_SECRET = Deno.env.get('LULU_SANDBOX_CLIENT_SECRET')!;
const LULU_PRODUCTION_CLIENT_KEY = Deno.env.get('LULU_PRODUCTION_CLIENT_KEY')!;
const LULU_PRODUCTION_CLIENT_SECRET = Deno.env.get('LULU_PRODUCTION_CLIENT_SECRET')!;
const LULU_USE_SANDBOX = Deno.env.get('LULU_USE_SANDBOX'); // "true" or "false"
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

// Fetch book retail price from Stripe by searching for products
async function getStripeBookPrice(bookType: 'softcover' | 'hardcover'): Promise<number> {
  // Search for prices with product names containing the book type
  const response = await fetch(
    `https://api.stripe.com/v1/prices?active=true&expand[]=data.product&limit=100`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      },
    }
  );

  if (!response.ok) {
    console.error('[get-lulu-shipping] Failed to fetch Stripe prices');
    // Fallback prices if Stripe fails (in cents)
    return bookType === 'hardcover' ? 3499 : 2499;
  }

  const data = await response.json();

  // Find a price whose product name contains the book type
  for (const price of data.data) {
    const productName = typeof price.product === 'object'
      ? price.product.name?.toLowerCase()
      : '';

    if (productName.includes(bookType) && productName.includes('book')) {
      console.log(`[get-lulu-shipping] Found Stripe price for ${bookType}:`, price.unit_amount);
      return price.unit_amount; // Already in cents
    }
  }

  // Fallback prices if no matching product found (in cents)
  console.log(`[get-lulu-shipping] No Stripe price found for ${bookType}, using fallback`);
  return bookType === 'hardcover' ? 3499 : 2499;
}

const SANDBOX_API_URL = 'https://api.sandbox.lulu.com';
const PRODUCTION_API_URL = 'https://api.lulu.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getLuluConfig(): LuluConfig {
  const useSandbox = LULU_USE_SANDBOX !== 'false'; // Default to sandbox

  if (useSandbox) {
    if (!LULU_SANDBOX_CLIENT_KEY || !LULU_SANDBOX_CLIENT_SECRET) {
      throw new Error('Missing sandbox credentials');
    }
    return {
      clientKey: LULU_SANDBOX_CLIENT_KEY,
      clientSecret: LULU_SANDBOX_CLIENT_SECRET,
      apiUrl: SANDBOX_API_URL,
      environment: 'sandbox',
    };
  } else {
    if (!LULU_PRODUCTION_CLIENT_KEY || !LULU_PRODUCTION_CLIENT_SECRET) {
      throw new Error('Missing production credentials');
    }
    return {
      clientKey: LULU_PRODUCTION_CLIENT_KEY,
      clientSecret: LULU_PRODUCTION_CLIENT_SECRET,
      apiUrl: PRODUCTION_API_URL,
      environment: 'production',
    };
  }
}

interface GetShippingRequest {
  shippingAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
    phoneNumber?: string;
    email?: string;
  };
  quantity?: number;
  bookType?: 'softcover' | 'hardcover';
}

Deno.serve(async (req) => {
  console.log('[get-lulu-shipping] Request received:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: GetShippingRequest = await req.json();
    console.log('[get-lulu-shipping] Request body:', body);

    if (!body.shippingAddress) {
      return new Response(JSON.stringify({ error: 'Missing shipping address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = getLuluConfig();
    console.log(`[get-lulu-shipping] Using ${config.environment} environment`);

    // Get access token
    console.log('[get-lulu-shipping] Getting Lulu access token...');
    const accessToken = await getLuluAccessToken(config);

    const quantity = body.quantity || 1;
    const shippingAddress: ShippingAddress = {
      name: body.shippingAddress.name,
      street1: body.shippingAddress.street1,
      street2: body.shippingAddress.street2,
      city: body.shippingAddress.city,
      stateCode: body.shippingAddress.stateCode,
      postalCode: body.shippingAddress.postalCode,
      countryCode: body.shippingAddress.countryCode || 'US',
      phoneNumber: body.shippingAddress.phoneNumber,
      email: body.shippingAddress.email,
    };

    // Get shipping rates from Lulu
    console.log('[get-lulu-shipping] Fetching shipping rates from Lulu...');
    const shippingOptions = await getShippingRates(
      config,
      accessToken,
      LULU_PRODUCT_CODE,
      quantity,
      shippingAddress
    );

    // Get book retail price from Stripe (this is YOUR selling price, not Lulu's cost)
    const bookType = body.bookType || 'hardcover';
    console.log(`[get-lulu-shipping] Fetching ${bookType} price from Stripe...`);
    const bookPriceCents = await getStripeBookPrice(bookType);
    console.log(`[get-lulu-shipping] Book retail price: ${bookPriceCents} cents`);

    return new Response(JSON.stringify({
      success: true,
      environment: config.environment,
      productCode: LULU_PRODUCT_CODE,
      bookType: bookType,
      pricing: {
        unitCost: bookPriceCents, // Your retail price in cents
        currency: 'USD',
      },
      shippingOptions: shippingOptions.map(option => ({
        ...option,
        cost: Math.round(option.cost * 100), // Lulu shipping in cents
      })),
      // Calculate total for each shipping option (all in cents)
      // Book price = YOUR Stripe retail price
      // Shipping = Lulu's actual shipping cost (pass-through)
      totals: shippingOptions.map(option => ({
        shippingOptionId: option.id,
        shippingOptionName: option.name,
        productCost: bookPriceCents,
        shippingCost: Math.round(option.cost * 100),
        totalCost: bookPriceCents + Math.round(option.cost * 100),
        currency: 'USD',
        deliveryDays: option.deliveryDays,
      })),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-lulu-shipping] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get shipping rates',
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
