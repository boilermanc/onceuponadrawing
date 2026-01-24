# Lulu xPress API Integration Guide

## Overview

This guide documents the complete integration between Once Upon a Drawing, Lulu xPress API, Stripe, and Supabase for custom book printing.

**Product Specifications:**
- **Product Code**: `0850X0850FCPRESS060UW444MXX`
- **Format**: 8.5" x 8.5" Square
- **Binding**: Perfect Bound (444)
- **Paper**: 60# Uncoated White (060UW)
- **Cover**: Matte (M)

## Architecture

```
User Orders Book
    ↓
Stripe Checkout (create-book-checkout)
    ↓
Payment Success
    ↓
Stripe Webhook (stripe-webhook)
    ↓
Process Book Order (process-book-order)
    ↓
    ├─ Generate PDFs with Puppeteer
    ├─ Upload to Supabase Storage
    ├─ Create Signed URLs (24h)
    └─ Submit Order to Lulu API
    ↓
Lulu Prints & Ships Book
```

## PDF Specifications

### Interior PDF
- **Dimensions**: 8.75" x 8.75" (includes 0.125" bleed on all sides)
- **Trim Size**: 8.5" x 8.5"
- **DPI**: 300
- **Color Mode**: RGB (Lulu converts to CMYK)
- **Format**: PDF

### Cover PDF
- **Dimensions**: Dynamic based on spine width
  - Width = (Back 8.5") + (Spine) + (Front 8.5") + (0.25" bleed)
  - Height = 8.75" (8.5" + 0.25" bleed)
- **DPI**: 300
- **Color Mode**: RGB
- **Format**: PDF

### Spine Calculation

```typescript
// Paper thickness for 60# Uncoated White
const PAGE_THICKNESS_INCHES = 0.00225;

// Calculate spine width
function calculateSpineWidth(pageCount: number): number {
  return pageCount * PAGE_THICKNESS_INCHES;
}

// Example: 32-page book
const spine = calculateSpineWidth(32); // 0.072 inches

// Cover width = 8.5 + 0.072 + 8.5 + 0.25 = 17.322 inches
```

## Implementation Files

### 1. PDF Specifications (`_shared/pdf-specs.ts`)

Contains all dimensional calculations and constants:
- `getInteriorPdfSpecs()` - Returns interior PDF dimensions
- `getCoverPdfSpecs(pageCount)` - Returns cover PDF dimensions with spine
- `calculateSpineWidth(pageCount)` - Calculates spine width
- `getPuppeteerPageSettings()` - Puppeteer page configuration
- `getPuppeteerViewport()` - Viewport settings for rendering

### 2. Lulu API Client (`_shared/lulu-api.ts`)

Handles all Lulu API interactions:
- `getLuluAccessToken()` - OAuth2 authentication
- `getShippingRates()` - Get shipping options for an address
- `getProductPricing()` - Get product pricing
- `createLuluOrder()` - Submit print order to Lulu
- `getOrderStatus()` - Check order status

### 3. PDF Generator (`_shared/pdf-generator.ts`)

Generates print-ready PDFs using Puppeteer:
- `generateInteriorPdf(content)` - Creates interior PDF with all pages
- `generateCoverPdf(content, pageCount)` - Creates cover PDF with proper layout

**Important Puppeteer Settings:**
```typescript
const pdf = await page.pdf({
  width: '8.75in',
  height: '8.75in',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
```

### 4. Shipping & Pricing Endpoint (`get-lulu-shipping/index.ts`)

Edge function that returns shipping options and pricing:

**Request:**
```json
{
  "shippingAddress": {
    "name": "John Doe",
    "street1": "123 Main St",
    "city": "New York",
    "stateCode": "NY",
    "postalCode": "10001",
    "countryCode": "US"
  },
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "pricing": {
    "unitCost": 12.50,
    "currency": "USD"
  },
  "shippingOptions": [
    {
      "id": "MAIL",
      "name": "Standard Mail",
      "cost": 5.99,
      "currency": "USD",
      "deliveryDays": "7-10"
    }
  ],
  "totals": [
    {
      "shippingOptionId": "MAIL",
      "productCost": 12.50,
      "shippingCost": 5.99,
      "totalCost": 18.49
    }
  ]
}
```

### 5. Book Order Processor (`process-book-order/index.ts`)

Triggered after successful Stripe payment:

1. Fetches book order and creation details from database
2. Generates interior and cover PDFs with Puppeteer
3. Uploads PDFs to Supabase Storage (`book-pdfs` bucket)
4. Creates signed URLs with 24-hour expiry
5. Submits order to Lulu with `printable_normalization`
6. Updates database with Lulu order ID

**Lulu Order JSON Structure:**
```json
{
  "line_items": [
    {
      "external_id": "book-order-uuid",
      "printable_normalization": {
        "cover": {
          "source_url": "https://supabase.co/storage/v1/object/sign/..."
        },
        "interior": {
          "source_url": "https://supabase.co/storage/v1/object/sign/..."
        }
      },
      "quantity": 1,
      "title": "My Story Book"
    }
  ],
  "shipping_address": {
    "name": "John Doe",
    "street1": "123 Main St",
    "city": "New York",
    "stateCode": "NY",
    "postalCode": "10001",
    "countryCode": "US",
    "phoneNumber": "555-1234",
    "email": "john@example.com"
  },
  "shipping_option_level": "MAIL",
  "contact_email": "john@example.com"
}
```

### 6. Stripe Webhook Enhancement (`stripe-webhook/index.ts`)

Updated to handle both credit purchases and book orders:

```typescript
if (orderSource === 'book_checkout') {
  // Update order status to 'payment_received'
  // Trigger async PDF generation and Lulu submission
}
```

## Database Schema

### book_orders Table

```sql
CREATE TABLE book_orders (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    creation_id uuid REFERENCES creations(id),
    
    order_type text, -- 'ebook' or 'hardcover'
    status text, -- 'pending', 'payment_received', 'processing', 'printed', 'shipped'
    
    dedication_text text,
    
    stripe_session_id text,
    stripe_payment_intent_id text,
    amount_paid integer,
    
    -- Shipping info
    shipping_name text,
    shipping_address text,
    shipping_city text,
    shipping_state text,
    shipping_zip text,
    shipping_country text,
    shipping_phone text,
    shipping_email text,
    
    -- Lulu fulfillment
    lulu_order_id text,
    tracking_number text,
    tracking_url text,
    
    created_at timestamptz,
    updated_at timestamptz
);
```

## Supabase Storage

### Bucket: `book-pdfs`

- **Purpose**: Store generated PDF files
- **Structure**: `books/{order_id}/interior-{timestamp}.pdf`
- **Signed URLs**: 24-hour expiry for Lulu download access
- **Public Access**: No (private bucket)

**Create bucket:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-pdfs', 'book-pdfs', false);
```

**Storage policies:**
```sql
-- Service role can insert PDFs
CREATE POLICY "Service role can upload PDFs"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'book-pdfs');

-- Service role can create signed URLs
CREATE POLICY "Service role can read PDFs"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'book-pdfs');
```

## Environment Variables

### Required for Supabase Edge Functions

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Lulu Sandbox
LULU_SANDBOX_CLIENT_KEY=your-sandbox-key
LULU_SANDBOX_CLIENT_SECRET=your-sandbox-secret

# Lulu Production
LULU_PRODUCTION_CLIENT_KEY=your-prod-key
LULU_PRODUCTION_CLIENT_SECRET=your-prod-secret

# Environment toggle
LULU_USE_SANDBOX=true  # Set to "false" for production
```

## Common Print-Ready Errors & Solutions

### ❌ Error: Incorrect DPI

**Problem**: PDFs generated at 72 DPI (screen resolution)

**Solution**: Use 300 DPI for print quality
```typescript
const specs = getInteriorPdfSpecs();
// widthPixels = 8.75" × 300 DPI = 2625px
await page.setViewport({
  width: specs.widthPixels,
  height: specs.heightPixels,
  deviceScaleFactor: 1,
});
```

### ❌ Error: Missing Bleed

**Problem**: PDFs at trim size (8.5" × 8.5") without bleed

**Solution**: Add 0.125" bleed on all sides
```typescript
// Interior: 8.5" + (0.125" × 2) = 8.75"
const widthInches = 8.5 + (0.125 * 2);
```

### ❌ Error: Incorrect Spine Width

**Problem**: Cover PDF has wrong spine width

**Solution**: Calculate based on page count
```typescript
const spineWidth = pageCount * 0.00225; // inches
const coverWidth = 8.5 + spineWidth + 8.5 + 0.25;
```

### ❌ Error: Lulu API 400 - Invalid printable_normalization

**Problem**: Incorrect JSON structure for PDFs

**Solution**: Use correct `printable_normalization` format
```typescript
printable_normalization: {
  cover: {
    source_url: coverSignedUrl  // NOT "cover_url"
  },
  interior: {
    source_url: interiorSignedUrl  // NOT "interior_url"
  }
}
```

### ❌ Error: Signed URL expired

**Problem**: Lulu tries to download PDF after 24 hours

**Solution**: Ensure Lulu downloads PDFs immediately. If needed, regenerate signed URLs:
```typescript
const { data } = await supabase.storage
  .from('book-pdfs')
  .createSignedUrl(path, 86400); // 24 hours = 86400 seconds
```

### ❌ Error: Background images not rendering

**Problem**: Puppeteer doesn't include background images in PDF

**Solution**: Set `printBackground: true`
```typescript
await page.pdf({
  printBackground: true,  // Critical for background images
});
```

## Testing Checklist

### PDF Generation
- [ ] Interior PDF is 8.75" × 8.75" (2625px × 2625px @ 300 DPI)
- [ ] Cover PDF width = (8.5 + spine + 8.5 + 0.25) inches
- [ ] Spine width calculated correctly for page count
- [ ] All images render with proper bleed
- [ ] Text stays within safe area (0.125" from trim)
- [ ] Backgrounds print correctly
- [ ] Fonts embedded properly

### API Integration
- [ ] Lulu authentication works (sandbox & production)
- [ ] Shipping rates return for test address
- [ ] Product pricing fetches correctly
- [ ] Order submission returns Lulu order ID
- [ ] Signed URLs are accessible for 24 hours
- [ ] Stripe webhook triggers book processing
- [ ] Database updates correctly at each stage

### User Flow
- [ ] User can select shipping address
- [ ] Shipping options display with costs
- [ ] Stripe checkout includes correct metadata
- [ ] Payment success triggers PDF generation
- [ ] Order status updates in real-time
- [ ] User receives order confirmation
- [ ] Admin can view Lulu order ID in database

## Monitoring & Logs

### Key Log Points

```typescript
console.log('[process-book-order] Starting PDF generation...');
console.log('[process-book-order] Interior PDF size:', interiorPdf.length, 'bytes');
console.log('[process-book-order] Signed URL expires:', new Date(Date.now() + 86400000));
console.log('[process-book-order] Lulu order ID:', luluOrder.id);
```

### Database Queries for Monitoring

```sql
-- Check pending orders
SELECT * FROM book_orders 
WHERE status = 'payment_received' 
AND created_at < NOW() - INTERVAL '1 hour';

-- Check orders with Lulu
SELECT id, status, lulu_order_id, created_at 
FROM book_orders 
WHERE lulu_order_id IS NOT NULL 
ORDER BY created_at DESC;

-- Storage usage
SELECT SUM(LENGTH(objects.metadata)) / 1024 / 1024 as mb_used
FROM storage.objects
WHERE bucket_id = 'book-pdfs';
```

## Cost Estimates

### Per Book Order

- **Lulu Print Cost**: ~$12-15 (varies by page count)
- **Shipping**: ~$5-10 (varies by location)
- **Supabase Storage**: ~0.1 MB per PDF × 2 = $0.02/month
- **Supabase Bandwidth**: ~1 MB per order = $0.09/GB
- **Edge Function Invocations**: 3 invocations = $0.0006

**Total Variable Cost**: ~$17-25 per book + minimal cloud costs

## Next Steps

1. **Set up Supabase Storage Bucket**
   ```bash
   # Create book-pdfs bucket in Supabase dashboard
   ```

2. **Deploy Edge Functions**
   ```bash
   supabase functions deploy get-lulu-shipping
   supabase functions deploy process-book-order
   supabase functions deploy stripe-webhook
   ```

3. **Configure Environment Variables**
   ```bash
   supabase secrets set LULU_SANDBOX_CLIENT_KEY=xxx
   supabase secrets set LULU_SANDBOX_CLIENT_SECRET=xxx
   # ... etc
   ```

4. **Test in Sandbox**
   - Use Lulu sandbox API with test credentials
   - Submit test orders
   - Verify PDFs meet print specifications

5. **Go Live**
   - Set `LULU_USE_SANDBOX=false`
   - Update to production Lulu credentials
   - Monitor first production orders closely

## Support & Resources

- **Lulu API Docs**: https://developers.lulu.com/
- **Lulu Product Calculator**: https://www.lulu.com/sell/pricing-calculator
- **Supabase Storage**: https://supabase.com/docs/guides/storage
- **Puppeteer PDF**: https://pptr.dev/api/puppeteer.pdfoptions

## Troubleshooting

### Issue: Lulu returns "Invalid PDF"

**Check:**
1. PDF dimensions match product specifications exactly
2. Bleed is included (not just trim size)
3. DPI is 300 (not 72)
4. Color mode is RGB
5. Fonts are embedded

### Issue: Order stuck in "processing"

**Check:**
1. Signed URLs are not expired
2. PDFs were uploaded to storage successfully
3. Lulu API credentials are correct
4. Check Lulu dashboard for order status
5. Review Edge Function logs for errors

### Issue: Webhook timeout

**Solution:** Book processing is async - webhook returns immediately and processing happens in background. Check database for status updates.

---

**Last Updated**: 2026-01-23
**Version**: 1.0
