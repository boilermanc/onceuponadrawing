/**
 * Lulu xPress API Client
 * Handles authentication, shipping rates, pricing, and order creation
 */

export interface LuluConfig {
  clientKey: string;
  clientSecret: string;
  apiUrl: string;
  environment: 'sandbox' | 'production';
}

export interface LuluTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string; // e.g., "US"
  phoneNumber?: string;
  email?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  currency: string;
  deliveryDays: string;
}

export interface PricingResponse {
  productCode: string;
  unitCost: number;
  currency: string;
  shippingCost?: number;
  totalCost?: number;
}

export interface PrintableNormalization {
  cover: {
    source_url: string;
  };
  interior: {
    source_url: string;
  };
}

export interface LuluOrderLineItem {
  external_id: string;
  printable_normalization: PrintableNormalization;
  quantity: number;
  title: string;
}

export interface LuluOrderRequest {
  line_items: LuluOrderLineItem[];
  shipping_address: ShippingAddress;
  shipping_option_level: string;
  contact_email: string;
}

export interface LuluOrderResponse {
  id: number;
  created_at: string;
  status: {
    name: string;
  };
  line_items: Array<{
    id: number;
    status: {
      name: string;
    };
  }>;
  tracking?: {
    number: string;
    url: string;
  };
}

/**
 * Get OAuth2 bearer token from Lulu
 */
export async function getLuluAccessToken(config: LuluConfig): Promise<string> {
  const credentials = btoa(`${config.clientKey}:${config.clientSecret}`);

  const response = await fetch(
    `${config.apiUrl}/auth/realms/glasstree/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Lulu API] Failed to get access token:', response.status, errorText);
    throw new Error(`Failed to get Lulu access token: ${response.status} ${errorText}`);
  }

  const data: LuluTokenResponse = await response.json();
  return data.access_token;
}

/**
 * Get shipping rates for a specific address and product
 * POST https://api.lulu.com/print-job-cost-calculations/
 *
 * We call the API for each shipping level to get all available options
 */
export async function getShippingRates(
  config: LuluConfig,
  accessToken: string,
  productCode: string,
  quantity: number,
  shippingAddress: ShippingAddress
): Promise<ShippingOption[]> {
  const shippingLevels = ['MAIL', 'GROUND', 'EXPEDITED', 'EXPRESS'];
  const results: ShippingOption[] = [];

  const shippingAddr = {
    name: shippingAddress.name,
    street1: shippingAddress.street1,
    street2: shippingAddress.street2 || '',
    city: shippingAddress.city,
    state_code: shippingAddress.stateCode,
    postcode: shippingAddress.postalCode,
    country_code: shippingAddress.countryCode,
    phone_number: shippingAddress.phoneNumber || '0000000000',
    email: shippingAddress.email || 'noreply@example.com',
  };

  for (const level of shippingLevels) {
    try {
      const requestBody = {
        line_items: [
          {
            page_count: 32,
            pod_package_id: productCode,
            quantity: quantity,
          },
        ],
        shipping_address: shippingAddr,
        shipping_level: level,
      };

      console.log(`[Lulu API] Requesting cost for ${level}:`, JSON.stringify(requestBody));

      const response = await fetch(
        `${config.apiUrl}/print-job-cost-calculations/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Lulu API] ${level} shipping not available:`, response.status, errorText);
        continue; // Skip this level if not available
      }

      const data = await response.json();
      console.log(`[Lulu API] ${level} response:`, JSON.stringify(data));

      // Extract shipping cost from response
      const shippingCost = data.shipping_cost?.total_cost_excl_tax ||
                          data.shipping_cost?.cost_excl_tax ||
                          data.total_shipping_cost ||
                          '0';

      results.push({
        id: level,
        name: getLevelDisplayName(level),
        cost: parseFloat(shippingCost),
        currency: data.currency || 'USD',
        deliveryDays: getDeliveryEstimate(level),
      });
    } catch (err) {
      console.warn(`[Lulu API] Error fetching ${level} shipping:`, err);
      // Continue with other levels
    }
  }

  if (results.length === 0) {
    throw new Error('No shipping options available for this address');
  }

  return results;
}

function getLevelDisplayName(level: string): string {
  const names: Record<string, string> = {
    'MAIL': 'Standard Mail',
    'GROUND': 'Ground',
    'EXPEDITED': 'Expedited',
    'EXPRESS': 'Express',
  };
  return names[level] || level;
}

function getDeliveryEstimate(level: string): string {
  const estimates: Record<string, string> = {
    'MAIL': '7-14 business days',
    'GROUND': '5-7 business days',
    'EXPEDITED': '3-5 business days',
    'EXPRESS': '1-3 business days',
  };
  return estimates[level] || 'Varies';
}

/**
 * Get pricing for a specific product
 * POST https://api.lulu.com/print-job-cost-calculations/
 */
export async function getProductPricing(
  config: LuluConfig,
  accessToken: string,
  productCode: string,
  quantity: number = 1,
  shippingLevel?: string
): Promise<PricingResponse> {
  const requestBody: any = {
    line_items: [
      {
        page_count: 32,
        pod_package_id: productCode,
        quantity: quantity,
      },
    ],
    shipping_level: shippingLevel || 'MAIL',
    shipping_address: {
      name: 'Price Check',
      street1: '123 Main St',
      city: 'New York',
      state_code: 'NY',
      postcode: '10001',
      country_code: 'US',
      phone_number: '0000000000',
      email: 'noreply@example.com',
    },
  };

  console.log('[Lulu API] Requesting pricing:', JSON.stringify(requestBody));

  const response = await fetch(
    `${config.apiUrl}/print-job-cost-calculations/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Lulu API] Failed to get pricing:', response.status, errorText);
    throw new Error(`Failed to get pricing: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  // Extract pricing from response
  const lineItem = data.line_item_costs?.[0] || data.line_items?.[0];
  
  return {
    productCode,
    unitCost: parseFloat(lineItem?.cost_excl_tax || lineItem?.total_cost_excl_tax || '0'),
    currency: lineItem?.currency || 'USD',
    shippingCost: data.shipping_cost?.total_cost_excl_tax 
      ? parseFloat(data.shipping_cost.total_cost_excl_tax) 
      : undefined,
    totalCost: data.total_cost_excl_tax 
      ? parseFloat(data.total_cost_excl_tax) 
      : undefined,
  };
}

/**
 * Create a print order on Lulu
 * POST https://api.lulu.com/orders/
 */
export async function createLuluOrder(
  config: LuluConfig,
  accessToken: string,
  orderRequest: LuluOrderRequest
): Promise<LuluOrderResponse> {
  console.log('[Lulu API] Creating order:', JSON.stringify(orderRequest, null, 2));

  const response = await fetch(
    `${config.apiUrl}/print-jobs/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(orderRequest),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Lulu API] Failed to create order:', response.status, errorText);
    throw new Error(`Failed to create Lulu order: ${response.status} ${errorText}`);
  }

  const data: LuluOrderResponse = await response.json();
  console.log('[Lulu API] Order created successfully:', data.id);
  
  return data;
}

/**
 * Get order status
 * GET https://api.lulu.com/print-jobs/{id}/
 */
export async function getOrderStatus(
  config: LuluConfig,
  accessToken: string,
  orderId: number
): Promise<LuluOrderResponse> {
  const response = await fetch(
    `${config.apiUrl}/print-jobs/${orderId}/`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Lulu API] Failed to get order status:', response.status, errorText);
    throw new Error(`Failed to get order status: ${response.status} ${errorText}`);
  }

  return response.json();
}
