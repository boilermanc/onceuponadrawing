const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

export const LOOKUP_KEYS = {
  credits: {
    starter: 'starter_pack',
    popular: 'popular_pack',
    best_value: 'best_value_pack',
  },
  books: {
    digital: 'book_digital',
    softcover: 'book_softcover',
    hardcover: 'book_hardcover',
  },
} as const;

export type CreditPackName = keyof typeof LOOKUP_KEYS.credits;
export type BookType = keyof typeof LOOKUP_KEYS.books;

export interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  lookup_key: string;
  product: string | { id: string; name: string; description?: string };
}

/**
 * Fetch a single Stripe price by lookup key.
 */
export async function getPriceByLookupKey(lookupKey: string): Promise<StripePrice> {
  const response = await fetch(
    `https://api.stripe.com/v1/prices?lookup_keys[]=${encodeURIComponent(lookupKey)}&expand[]=data.product`,
    {
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stripe API error fetching lookup key "${lookupKey}" (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error(`No price found for lookup key: ${lookupKey}`);
  }

  return data.data[0];
}

/**
 * Fetch multiple Stripe prices by lookup keys in a single API call.
 */
export async function getPricesByLookupKeys(lookupKeys: string[]): Promise<StripePrice[]> {
  const params = lookupKeys.map(key => `lookup_keys[]=${encodeURIComponent(key)}`).join('&');
  const response = await fetch(
    `https://api.stripe.com/v1/prices?${params}&expand[]=data.product`,
    {
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stripe API error fetching lookup keys (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Format a cent amount as a currency string (e.g., "$12.99").
 */
export function formatPrice(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
