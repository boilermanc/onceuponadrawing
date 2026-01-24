# Stripe Book Product Setup Guide

## Overview

This guide will walk you through creating Stripe Products and Prices for the Softcover and Hardcover books.

## Prerequisites

- Stripe account (Test and/or Production mode)
- Access to Stripe Dashboard
- Admin access to your Supabase project

---

## Step 1: Create Softcover Product in Stripe

### Via Stripe Dashboard

1. Go to https://dashboard.stripe.com/products
2. Click **"+ Add Product"**
3. Fill in the details:
   - **Name**: `Softcover Storybook`
   - **Description**: `8.5" × 8.5" Square, Perfect Bound, Matte Cover`
   - **Pricing**:
     - Model: `One-time`
     - Price: Enter your price (e.g., `34.99`)
     - Billing period: `One time`
   - **Tax behavior**: Choose appropriate tax setting
4. Click **"Save product"**
5. **Copy the Price ID** - it looks like `price_1xxxxxxxxxxxxxx`

### Example Price ID
```
price_1SsXXXGzopxGCjLeXXXXXXXX
```

---

## Step 2: Create Hardcover Product in Stripe

### Via Stripe Dashboard

1. Go to https://dashboard.stripe.com/products
2. Click **"+ Add Product"**
3. Fill in the details:
   - **Name**: `Hardcover Storybook`
   - **Description**: `8.5" × 8.5" Square, Casewrap Hardcover, Premium Color`
   - **Pricing**:
     - Model: `One-time`
     - Price: Enter your price (e.g., `49.99`)
     - Billing period: `One time`
   - **Tax behavior**: Choose appropriate tax setting
4. Click **"Save product"**
5. **Copy the Price ID** - it looks like `price_1xxxxxxxxxxxxxx`

### Example Price ID
```
price_1SsYYYGzopxGCjLeYYYYYYYY
```

---

## Step 3: Update the Edge Function

Open `supabase/functions/get-book-prices/index.ts` and replace the placeholder Price IDs:

```typescript
const BOOK_PRICE_IDS = {
  ebook: 'price_1SsRkzGzopxGCjLeKjAifMlZ', // Keep existing
  softcover: 'price_1SsXXXGzopxGCjLeXXXXXXXX', // ← Replace with your Softcover Price ID
  hardcover: 'price_1SsYYYGzopxGCjLeYYYYYYYY', // ← Replace with your Hardcover Price ID
}
```

### Find and Replace

**Before:**
```typescript
softcover: 'price_SOFTCOVER_ID', // TODO: Replace with actual Stripe price ID
hardcover: 'price_HARDCOVER_ID', // TODO: Replace with actual Stripe price ID
```

**After:**
```typescript
softcover: 'price_1SsXXXGzopxGCjLeXXXXXXXX', // Your actual Softcover Price ID
hardcover: 'price_1SsYYYGzopxGCjLeYYYYYYYY', // Your actual Hardcover Price ID
```

---

## Step 4: Deploy the Updated Function

```bash
supabase functions deploy get-book-prices
```

---

## Step 5: Test the Integration

### Test via Admin Dashboard

1. Go to your app's Admin Dashboard
2. Navigate to the **"Print Preview"** tab
3. You should see the dropdown with actual prices:
   - 📘 Softcover ($34.99) ← from Stripe
   - 📕 Hardcover ($49.99) ← from Stripe

### Test via API

```bash
# Test in browser console or use curl
const { data } = await supabase.functions.invoke('get-book-prices');
console.log(data);
```

**Expected Response:**
```json
{
  "ebook": {
    "priceId": "price_1SsRkzGzopxGCjLeKjAifMlZ",
    "amount": 999,
    "currency": "usd",
    "displayPrice": "$9.99",
    "productName": "Digital Storybook"
  },
  "softcover": {
    "priceId": "price_1SsXXXGzopxGCjLeXXXXXXXX",
    "amount": 3499,
    "currency": "usd",
    "displayPrice": "$34.99",
    "productName": "Softcover Storybook"
  },
  "hardcover": {
    "priceId": "price_1SsYYYGzopxGCjLeYYYYYYYY",
    "amount": 4999,
    "currency": "usd",
    "displayPrice": "$49.99",
    "productName": "Hardcover Storybook"
  }
}
```

---

## Pricing Calculation Guide

### Factors to Consider

1. **Lulu Manufacturing Cost**
   - Use Lulu's Print Calculator: https://www.lulu.com/print-calculator
   - Input: 8.5" × 8.5", 32 pages, Full Color
   - Note the base cost

2. **Shipping Costs**
   - Domestic vs International
   - Standard vs Expedited
   - Add buffer for shipping (15-25%)

3. **Your Profit Margin**
   - Typical: 30-50% of final price
   - Adjust based on market research

4. **Payment Processing Fees**
   - Stripe: 2.9% + $0.30 per transaction
   - Factor into your pricing

### Example Calculation

**Softcover:**
- Lulu manufacturing: $12.00
- Shipping (avg): $5.00
- Stripe fees: $1.32 (2.9% of $35 + $0.30)
- Your profit: $16.68
- **Final Price: $34.99**

**Hardcover:**
- Lulu manufacturing: $18.00
- Shipping (avg): $6.00
- Stripe fees: $1.75 (2.9% of $50 + $0.30)
- Your profit: $24.25
- **Final Price: $49.99**

---

## Test Mode vs Production Mode

### Test Mode (Recommended First)

1. Create products in **Test Mode** (toggle in top-right of Stripe Dashboard)
2. Use test Price IDs (start with `price_1...` but from test mode)
3. Use test card: `4242 4242 4242 4242`
4. Test the full checkout flow

### Production Mode

1. Once testing is complete, switch to **Live Mode**
2. Create the same products in Live Mode
3. Update `get-book-prices/index.ts` with Live Price IDs
4. Deploy: `supabase functions deploy get-book-prices`

---

## Troubleshooting

### Prices Not Loading

**Check Browser Console:**
```
[AdminDashboard] Fetching book prices from Stripe...
[AdminDashboard] Book prices received: { ... }
```

**Common Issues:**
1. Price IDs are still placeholders (`price_SOFTCOVER_ID`)
2. Function not deployed: `supabase functions deploy get-book-prices`
3. Stripe API key not set in Supabase (check `STRIPE_SECRET_KEY` env var)

### Wrong Prices Displayed

1. Verify Price IDs in Stripe Dashboard
2. Check that you're in the correct mode (Test vs Live)
3. Clear browser cache and refresh

### API Returns Null for a Book Type

```json
{
  "softcover": null,  // ← Price fetch failed
  "hardcover": { ... }
}
```

**Solutions:**
1. Check Stripe logs for API errors
2. Verify the Price ID exists in Stripe
3. Check Supabase function logs: https://supabase.com/dashboard/project/YOUR_PROJECT/functions/get-book-prices/logs

---

## Next Steps

Once prices are working in the Admin Dashboard:

1. **Update BookPurchaseModal.tsx** to fetch and display prices
2. **Update create-book-checkout** to use Stripe Price IDs
3. **Test full purchase flow** in Test Mode
4. **Switch to Production** when ready

---

## Useful Commands

```bash
# Deploy price function
supabase functions deploy get-book-prices

# Test locally (if you have Supabase CLI configured)
supabase functions serve get-book-prices

# View logs
# Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/functions/get-book-prices/logs
```

---

## Reference

- Stripe Products: https://dashboard.stripe.com/products
- Stripe API Docs: https://stripe.com/docs/api/prices
- Lulu Print Calculator: https://www.lulu.com/print-calculator
- Current Implementation: `supabase/functions/get-book-prices/index.ts`
