# Frontend Order Flow Examples

This directory contains example implementations of the hardcover book order flow.

## Overview

The customer order flow consists of these steps:

1. **User enters shipping address**
2. **Fetch shipping options** from Lulu API (via `get-lulu-shipping` function)
3. **User selects shipping method**
4. **Create Stripe Checkout** (via `create-book-checkout` function)
5. **User completes payment** on Stripe
6. **Webhook processes order** (Stripe webhook → `stripe-webhook` → `process-book-order`)
7. **Book is printed and shipped** by Lulu

## Backend Flow

### 1. Get Shipping Rates (`get-lulu-shipping`)

**Fixed Specifications:**
- Product Code: `0850X0850FCPRESS060UW444MXX` (8.5" x 8.5" softcover)
- Page Count: `32` (hardcoded in lulu-api.ts)

**Request:**
```typescript
POST /functions/v1/get-lulu-shipping

{
  "shippingAddress": {
    "name": "John Doe",
    "street1": "123 Main St",
    "street2": "Apt 4",  // Optional
    "city": "San Francisco",
    "stateCode": "CA",
    "postalCode": "94102",
    "countryCode": "US",
    "phoneNumber": "555-1234",  // Optional
    "email": "john@example.com"
  },
  "quantity": 1  // Optional, defaults to 1
}
```

**Response:**
```typescript
{
  "success": true,
  "environment": "sandbox",  // or "production"
  "productCode": "0850X0850FCPRESS060UW444MXX",
  "pricing": {
    "unitCost": 8.95,  // Book cost in dollars
    "currency": "USD"
  },
  "shippingOptions": [
    {
      "id": "MAIL",
      "name": "Standard Mail",
      "cost": 4.99,
      "currency": "USD",
      "deliveryDays": "5-10"
    },
    {
      "id": "PRIORITY_MAIL",
      "name": "Priority Mail",
      "cost": 8.99,
      "currency": "USD",
      "deliveryDays": "2-3"
    }
  ],
  "totals": [
    {
      "shippingOptionId": "MAIL",
      "shippingOptionName": "Standard Mail",
      "productCost": 8.95,
      "shippingCost": 4.99,
      "totalCost": 13.94,
      "currency": "USD",
      "deliveryDays": "5-10"
    }
  ]
}
```

### 2. Create Checkout Session (`create-book-checkout`)

**Request:**
```typescript
POST /functions/v1/create-book-checkout

{
  // Order details
  "creationId": "uuid-of-creation",
  "userId": "uuid-of-user",
  "userEmail": "john@example.com",
  "productType": "hardcover",  // or "ebook"
  "dedicationText": "For my beloved child",  // Optional
  
  // Shipping details (required for hardcover)
  "shippingAddress": {
    "name": "John Doe",
    "street1": "123 Main St",
    "street2": "Apt 4",
    "city": "San Francisco",
    "stateCode": "CA",
    "postalCode": "94102",
    "countryCode": "US",
    "phoneNumber": "555-1234",
    "email": "john@example.com"
  },
  "shippingLevelId": "MAIL",  // From get-lulu-shipping response
  "shippingCost": 499,  // In cents (from get-lulu-shipping response)
  "bookCost": 895,  // In cents (from get-lulu-shipping response)
  
  // Optional - if you have pre-created Stripe prices
  "priceId": "price_xxx"  // Stripe price ID
}
```

**Response:**
```typescript
{
  "url": "https://checkout.stripe.com/c/pay/cs_xxx...",
  "orderId": "uuid-of-book-order"
}
```

### 3. Webhook Processing (Automatic)

When the Stripe checkout completes:

1. **Stripe sends webhook** to `/functions/v1/stripe-webhook`
2. **Webhook verifies** the payment and updates order status to `payment_received`
3. **Webhook triggers** `/functions/v1/process-book-order` asynchronously
4. **process-book-order**:
   - Fetches book content from database (creation + story pages)
   - Generates production PDFs (interior + cover) using pdf-lib
   - Uploads PDFs to Supabase Storage
   - Creates 24-hour signed URLs
   - Submits order to Lulu API with:
     - PDF URLs
     - Shipping address
     - Shipping level (from database)
   - Updates order status to `printed`
   - Stores Lulu order ID

## Frontend Integration

### React/Next.js Example

See `OrderPage.tsx` for a complete example using:
- React hooks
- TypeScript
- Tailwind CSS
- Supabase client

### Vue 3 Example

See `OrderPage.vue` for a complete example using:
- Vue 3 Composition API
- TypeScript
- Tailwind CSS
- Supabase client

## Environment Variables

### Backend (Supabase Edge Functions)

Add these to your Supabase project secrets:

```bash
# Lulu API Credentials
LULU_SANDBOX_CLIENT_KEY=your_sandbox_key
LULU_SANDBOX_CLIENT_SECRET=your_sandbox_secret
LULU_PRODUCTION_CLIENT_KEY=your_production_key
LULU_PRODUCTION_CLIENT_SECRET=your_production_secret
LULU_USE_SANDBOX=true  # Set to "false" for production

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx  # or sk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Supabase (automatically provided by Edge Functions)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### Frontend

```bash
# Next.js (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Vite/Vue (.env)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

## Database Migration

Run the migration to add necessary fields:

```bash
# Apply migration 006_add_shipping_fields.sql
supabase db push
```

This adds:
- `shipping_level_id` - Stores the selected Lulu shipping level
- `shipping_address2` - Stores apartment/suite number
- `contact_email` - Customer email for order updates

## Testing

### Test with Sandbox Mode

1. Set `LULU_USE_SANDBOX=true`
2. Use Stripe test cards: `4242 4242 4242 4242`
3. Lulu sandbox won't actually print books
4. Check logs in Supabase Edge Function logs

### Webhook Testing Locally

Use Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

## Success/Cancel Pages

Create these pages in your frontend:

- `/order-success?session_id={CHECKOUT_SESSION_ID}` - Show order confirmation
- `/order-cancelled` - Allow user to retry

You can retrieve order details on the success page:

```typescript
// On order-success page
const sessionId = new URLSearchParams(window.location.search).get('session_id');

// Fetch order details from your backend
const { data: order } = await supabase
  .from('book_orders')
  .select('*')
  .eq('stripe_session_id', sessionId)
  .single();
```

## Pricing Notes

- **eBook**: Fixed at $12.99 (1299 cents)
- **Hardcover**: Book cost (from Lulu) + Shipping cost (from Lulu)
  - Example: $8.95 (book) + $4.99 (shipping) = $13.94 total

The pricing is dynamic based on Lulu's API response, so you always charge the correct amount.

## Support

For issues, check:
1. Supabase Edge Function logs
2. Stripe webhook logs
3. Lulu API sandbox dashboard
