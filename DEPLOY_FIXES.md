# Deploy Order Flow Fixes

## Issues Fixed

1. ✅ **CORS Error** - Added `Access-Control-Allow-Methods` header to Edge Functions
2. ✅ **Button Validation** - Button is already disabled until all required fields are filled

## Changes Made

### Backend Functions
- `get-lulu-shipping/index.ts` - Added CORS methods header
- `create-book-checkout/index.ts` - Added CORS methods header

### Frontend
- Button validation already working correctly
- All required fields must be filled before continuing

## Deployment Steps

### 1. Deploy Edge Functions

You need to redeploy the updated Edge Functions to Supabase:

```bash
# Make sure you're in the project root
cd c:\Users\clint\Documents\Github\onceuponadrawing

# Deploy get-lulu-shipping function
supabase functions deploy get-lulu-shipping

# Deploy create-book-checkout function
supabase functions deploy create-book-checkout
```

### 2. Set Environment Variables (if not already set)

Make sure these are set in your Supabase project:

```bash
# Lulu API
supabase secrets set LULU_SANDBOX_CLIENT_KEY=your_key
supabase secrets set LULU_SANDBOX_CLIENT_SECRET=your_secret
supabase secrets set LULU_PRODUCTION_CLIENT_KEY=your_key
supabase secrets set LULU_PRODUCTION_CLIENT_SECRET=your_secret
supabase secrets set LULU_USE_SANDBOX=true

# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 3. Apply Database Migration

```bash
supabase db push
```

This applies the `006_add_shipping_fields.sql` migration that adds:
- `shipping_level_id`
- `shipping_address2`
- `contact_email`

### 4. Test the Flow

1. Start your dev server: `npm run dev`
2. Click "Order Book" on a creation
3. Select Hardcover
4. Try clicking "Continue to Shipping Options" before filling fields → Should be disabled
5. Fill all required fields → Button should become enabled
6. Submit form → Should fetch shipping rates without CORS error

## Required Fields Validation

The button is disabled until:
- ✅ Name (at least 2 characters)
- ✅ Email (contains @)
- ✅ Street Address (at least 5 characters)
- ✅ City (at least 2 characters)
- ✅ State (exactly 2 characters)
- ✅ ZIP Code (at least 5 characters)

Optional fields:
- Apartment/Suite
- Phone Number

## Troubleshooting

### Still seeing CORS error?

1. Make sure you deployed the functions:
   ```bash
   supabase functions deploy get-lulu-shipping
   ```

2. Check function logs:
   ```bash
   supabase functions logs get-lulu-shipping
   ```

3. Verify the CORS headers are present by checking the function code in Supabase dashboard

### Button still not working?

1. Open browser console
2. Type: `document.querySelector('button[disabled]')`
3. Check if button has `disabled` attribute
4. Verify all required fields are filled correctly

### Function returns error?

1. Check Supabase Edge Function logs
2. Verify environment variables are set
3. Make sure `LULU_USE_SANDBOX=true` for testing
4. Check that Lulu API credentials are valid

## Testing Checklist

- [ ] Deploy `get-lulu-shipping` function
- [ ] Deploy `create-book-checkout` function
- [ ] Apply database migration
- [ ] Test button validation (disabled when empty)
- [ ] Test button validation (enabled when filled)
- [ ] Test shipping rates fetch (no CORS error)
- [ ] Test full checkout flow
- [ ] Verify Stripe redirect works
- [ ] Verify webhook processes order

## Next Steps

Once testing is complete:
1. Set `LULU_USE_SANDBOX=false` for production
2. Update Stripe keys to production
3. Configure Stripe webhook URL
4. Monitor first few orders

---

**Status**: Ready to deploy! 🚀

Deploy the functions and the CORS error should be resolved.
