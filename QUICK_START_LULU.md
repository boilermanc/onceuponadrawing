# Quick Start: Lulu Integration

This guide will get you up and running with Lulu book printing in 15 minutes.

## Prerequisites

- [ ] Supabase project set up
- [ ] Stripe account configured
- [ ] Lulu xPress API credentials (sandbox & production)
- [ ] Supabase CLI installed

## Step 1: Update Page Count (2 min)

Edit `supabase/functions/_shared/book-config.ts`:

```typescript
export const FIXED_PAGE_COUNT = 32; // Update to your actual page count
```

**How to determine page count:**
- Count all pages in your book (including title, dedication, story, end pages)
- Must be an even number
- Minimum 24 pages for perfect binding

## Step 2: Create Storage Bucket (2 min)

1. Go to Supabase Dashboard → Storage
2. Click "Create bucket"
3. Name: `book-pdfs`
4. Public: **No** (keep private)
5. Click "Create bucket"

## Step 3: Set Environment Variables (3 min)

```bash
# Navigate to your project
cd c:\Users\clint\Documents\Github\onceuponadrawing

# Set Lulu credentials
supabase secrets set LULU_SANDBOX_CLIENT_KEY="your-sandbox-key"
supabase secrets set LULU_SANDBOX_CLIENT_SECRET="your-sandbox-secret"
supabase secrets set LULU_PRODUCTION_CLIENT_KEY="your-prod-key"
supabase secrets set LULU_PRODUCTION_CLIENT_SECRET="your-prod-secret"

# Start with sandbox
supabase secrets set LULU_USE_SANDBOX="true"
```

## Step 4: Deploy Edge Functions (5 min)

```bash
# Deploy all functions
supabase functions deploy get-lulu-shipping
supabase functions deploy process-book-order
supabase functions deploy stripe-webhook
supabase functions deploy test-pdf-specs
supabase functions deploy generate-book-preview
```

## Step 5: Test the Integration (3 min)

### Test PDF Specs

```bash
# Test that specs are calculated correctly
curl -X POST https://your-project.supabase.co/functions/v1/test-pdf-specs
```

Expected output:
```json
{
  "success": true,
  "summary": {
    "total": 9,
    "passed": 9,
    "failed": 0,
    "passRate": "100.0%"
  }
}
```

### Test Lulu Connection

Visit your test-lulu function (already exists):
```bash
curl -X GET https://your-project.supabase.co/functions/v1/test-lulu
```

Expected output:
```json
{
  "success": true,
  "message": "Lulu API connection successful",
  "environment": "sandbox"
}
```

### Test Shipping Rates

```bash
curl -X POST https://your-project.supabase.co/functions/v1/get-lulu-shipping \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "name": "Test User",
      "street1": "123 Main St",
      "city": "New York",
      "stateCode": "NY",
      "postalCode": "10001",
      "countryCode": "US"
    }
  }'
```

Expected output:
```json
{
  "success": true,
  "shippingOptions": [
    {
      "id": "MAIL",
      "name": "Standard Mail",
      "cost": 5.99,
      "deliveryDays": "7-10"
    }
  ]
}
```

## ✅ You're Done!

If all tests passed, your integration is ready. Now integrate with your frontend:

## Frontend Integration

### 1. Get Shipping Options

```typescript
// services/luluService.ts
export async function getShippingOptions(address: ShippingAddress) {
  const { data, error } = await supabase.functions.invoke('get-lulu-shipping', {
    body: { shippingAddress: address },
  });
  
  if (error) throw error;
  return data;
}
```

### 2. Create Book Checkout

Your existing `create-book-checkout` function already works! Just make sure it includes shipping address:

```typescript
const { data } = await supabase.functions.invoke('create-book-checkout', {
  body: {
    priceId: selectedPriceId,
    productType: 'hardcover',
    userId: user.id,
    creationId: creation.id,
    userEmail: user.email,
    dedicationText: dedication,
  },
});
```

### 3. Payment Flow

The rest is automatic:
1. User pays → Stripe webhook triggered
2. Webhook → Triggers PDF generation
3. PDFs → Uploaded to storage
4. Order → Submitted to Lulu
5. Done! ✨

## Monitoring

### Check Order Status

```sql
-- In Supabase SQL Editor
SELECT 
  id,
  status,
  lulu_order_id,
  created_at,
  updated_at
FROM book_orders
ORDER BY created_at DESC
LIMIT 10;
```

### Check Storage Usage

```sql
SELECT 
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint / 1024 / 1024 as size_mb
FROM storage.objects
WHERE bucket_id = 'book-pdfs';
```

## Troubleshooting

### Issue: Functions not deploying

```bash
# Check Supabase status
supabase status

# Login if needed
supabase login

# Link project
supabase link --project-ref your-project-ref
```

### Issue: Environment variables not set

```bash
# List all secrets
supabase secrets list

# Should see:
# - LULU_SANDBOX_CLIENT_KEY
# - LULU_SANDBOX_CLIENT_SECRET
# - LULU_USE_SANDBOX
```

### Issue: Test endpoint returns 401

Check that your Lulu credentials are correct. Get them from:
- Sandbox: https://developers.lulu.com/dashboard (sandbox tab)
- Production: https://developers.lulu.com/dashboard (production tab)

## Next Steps

### Before Going Live

1. **Test Print Preview** ⭐ NEW
   - [ ] Go to Admin Dashboard → Print Preview tab
   - [ ] Generate preview for a test creation
   - [ ] Download and inspect both PDFs
   - [ ] Verify dimensions, DPI, and bleed
   - [ ] Check specs summary matches expectations
   - [ ] See [PRINT_PREVIEW_GUIDE.md](./PRINT_PREVIEW_GUIDE.md) for details

2. **Test Complete Flow**
   - [ ] Create a real story in your app
   - [ ] Order a book with test Stripe payment
   - [ ] Verify PDFs generated correctly
   - [ ] Check Lulu sandbox dashboard for order

3. **Review PDFs**
   - [ ] Download PDFs from Supabase Storage
   - [ ] Open in Adobe Acrobat
   - [ ] Verify dimensions (8.75" × 8.75" interior)
   - [ ] Check DPI is 300
   - [ ] Confirm bleed extends to edges

3. **Go Production**
   ```bash
   supabase secrets set LULU_USE_SANDBOX="false"
   ```

### After Launch

- Monitor first 10 orders closely
- Check order status in Lulu dashboard
- Set up error notifications
- Track customer feedback

## Support

- **Issues?** Check `LULU_INTEGRATION_GUIDE.md` for detailed troubleshooting
- **Print errors?** Review `PRINT_READY_CHECKLIST.md`
- **Need help?** Open an issue with:
  - Function logs from Supabase Dashboard
  - Error messages
  - Test results

## Resources

- [PRINT_PREVIEW_GUIDE.md](./PRINT_PREVIEW_GUIDE.md) - **NEW** Print preview & test feature
- [LULU_INTEGRATION_GUIDE.md](./LULU_INTEGRATION_GUIDE.md) - Complete technical documentation
- [PRINT_READY_CHECKLIST.md](./PRINT_READY_CHECKLIST.md) - Quality assurance guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - What was built

---

**Estimated Time**: 15 minutes
**Difficulty**: Easy
**Status**: ✅ Ready to Deploy
