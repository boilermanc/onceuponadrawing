# Print-Ready PDF Checklist

## Critical Specifications for Lulu xPress Product 0850X0850FCPRESS060UW444MXX

### ✅ Interior PDF Requirements

- [ ] **Dimensions**: 8.75" × 8.75" (NOT 8.5" × 8.5")
- [ ] **Bleed**: 0.125" on all sides (included in dimensions)
- [ ] **Trim Size**: 8.5" × 8.5" (final book size)
- [ ] **DPI**: 300 (NOT 72)
- [ ] **Resolution**: 2625px × 2625px (8.75" × 300 DPI)
- [ ] **Color Mode**: RGB (Lulu converts to CMYK)
- [ ] **File Format**: PDF
- [ ] **Safe Area**: Keep text/important content 0.125" from trim
- [ ] **Background Images**: Must use `printBackground: true` in Puppeteer
- [ ] **Fonts**: All fonts must be embedded

### ✅ Cover PDF Requirements

- [ ] **Height**: 8.75" (8.5" + 0.25" bleed)
- [ ] **Width**: DYNAMIC = (Back 8.5") + (Spine) + (Front 8.5") + (0.25" bleed)
- [ ] **Spine Calculation**: page_count × 0.00225"
  - Example: 32 pages = 0.072" spine
  - Total width = 8.5 + 0.072 + 8.5 + 0.25 = 17.322"
- [ ] **DPI**: 300
- [ ] **Resolution**: Width calculated × 300 DPI
- [ ] **Layout Order**: [Bleed] [Back Cover] [Spine] [Front Cover] [Bleed]
- [ ] **Spine Text**: Rotated 180° (vertical-lr + rotate(180deg))
- [ ] **Cover Image**: Full bleed to edges
- [ ] **Title/Author**: Positioned within safe area on front cover

### ✅ Puppeteer Configuration

```typescript
// ✅ CORRECT Configuration
const specs = getInteriorPdfSpecs();

await page.setViewport({
  width: specs.widthPixels,        // 2625px
  height: specs.heightPixels,      // 2625px
  deviceScaleFactor: 1,
});

const pdf = await page.pdf({
  width: `${specs.widthInches}in`, // 8.75in
  height: `${specs.heightInches}in`, // 8.75in
  printBackground: true,           // CRITICAL!
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
```

```typescript
// ❌ WRONG Configuration (Common Mistakes)

// ❌ Missing bleed
width: '8.5in',  // Should be 8.75in
height: '8.5in', // Should be 8.75in

// ❌ Wrong DPI (defaults to 72)
deviceScaleFactor: 1, // Needs viewport set to 2625px

// ❌ Backgrounds won't print
printBackground: false, // Must be true!

// ❌ Wrong viewport (screen DPI)
await page.setViewport({
  width: 800,  // Should be 2625
  height: 800, // Should be 2625
});
```

### ✅ Lulu API JSON Structure

```typescript
// ✅ CORRECT Structure
{
  "line_items": [
    {
      "external_id": "unique-order-id",
      "printable_normalization": {      // Correct key name
        "cover": {
          "source_url": "https://..."   // Correct key: source_url
        },
        "interior": {
          "source_url": "https://..."   // Correct key: source_url
        }
      },
      "quantity": 1,
      "title": "Book Title"
    }
  ],
  "shipping_address": {
    "name": "Full Name",
    "street1": "123 Main St",
    "city": "New York",
    "stateCode": "NY",                   // Use stateCode not state
    "postalCode": "10001",               // Use postalCode not zip
    "countryCode": "US",                 // Use countryCode not country
    "phoneNumber": "555-1234",
    "email": "user@example.com"
  },
  "shipping_option_level": "MAIL",
  "contact_email": "user@example.com"
}
```

```typescript
// ❌ WRONG Structure (Will cause 400 errors)
{
  "printable_urls": {          // ❌ Wrong key
    "cover_url": "...",        // ❌ Wrong key
    "interior_url": "..."      // ❌ Wrong key
  }
}

{
  "shipping_address": {
    "state": "NY",             // ❌ Should be stateCode
    "zip": "10001",            // ❌ Should be postalCode
    "country": "US"            // ❌ Should be countryCode
  }
}
```

## Validation Scripts

### Test Interior Specs

```typescript
import { getInteriorPdfSpecs, PRINT_DPI } from './_shared/pdf-specs.ts';

const specs = getInteriorPdfSpecs();

console.log('Interior PDF Specifications:');
console.log('===========================');
console.log(`Width: ${specs.widthInches}" (${specs.widthPixels}px)`);
console.log(`Height: ${specs.heightInches}" (${specs.heightPixels}px)`);
console.log(`DPI: ${specs.dpi}`);
console.log(`Bleed: 0.125" on all sides`);
console.log('');

// Validation
if (specs.widthInches !== 8.75) console.error('❌ Width should be 8.75"');
if (specs.heightInches !== 8.75) console.error('❌ Height should be 8.75"');
if (specs.widthPixels !== 2625) console.error('❌ Width should be 2625px');
if (specs.heightPixels !== 2625) console.error('❌ Height should be 2625px');
if (specs.dpi !== 300) console.error('❌ DPI should be 300');

console.log('✅ All interior specs correct!');
```

### Test Cover Specs

```typescript
import { getCoverPdfSpecs } from './_shared/pdf-specs.ts';

const pageCount = 32; // Your book page count
const specs = getCoverPdfSpecs(pageCount);

console.log('Cover PDF Specifications:');
console.log('========================');
console.log(`Page Count: ${pageCount}`);
console.log(`Spine Width: ${specs.spineWidthInches.toFixed(4)}"`);
console.log(`Total Width: ${specs.widthInches.toFixed(4)}" (${specs.widthPixels}px)`);
console.log(`Height: ${specs.heightInches}" (${specs.heightPixels}px)`);
console.log('');
console.log('Layout:');
console.log(`- Left Bleed: 0.125"`);
console.log(`- Back Cover: ${specs.backCoverWidthInches}"`);
console.log(`- Spine: ${specs.spineWidthInches.toFixed(4)}"`);
console.log(`- Front Cover: ${specs.frontCoverWidthInches}"`);
console.log(`- Right Bleed: 0.125"`);
console.log('');

// Expected calculations
const expectedSpine = pageCount * 0.00225;
const expectedWidth = 8.5 + expectedSpine + 8.5 + 0.25;

if (Math.abs(specs.spineWidthInches - expectedSpine) > 0.0001) {
  console.error('❌ Spine calculation incorrect');
}
if (Math.abs(specs.widthInches - expectedWidth) > 0.0001) {
  console.error('❌ Width calculation incorrect');
}
if (specs.heightInches !== 8.75) {
  console.error('❌ Height should be 8.75"');
}

console.log('✅ All cover specs correct!');
```

### Visual Inspection Checklist

After generating PDFs, manually check:

#### Interior PDF
- [ ] Open PDF in Adobe Acrobat or similar
- [ ] Check document properties: 8.75" × 8.75" @ 300 DPI
- [ ] Print a test page and measure: should be 8.75" × 8.75"
- [ ] Check that backgrounds/images extend to all edges (bleed)
- [ ] Verify text is at least 0.125" from edges
- [ ] Check that page count is even

#### Cover PDF
- [ ] Open PDF in Adobe Acrobat
- [ ] Check dimensions match calculations
- [ ] Measure spine width with ruler tool
- [ ] Verify front cover image extends to edges
- [ ] Check spine text is rotated correctly
- [ ] Verify title/author within safe area (not in bleed)

### Pre-Submit Checklist

Before submitting to Lulu:

- [ ] **PDFs Generated**: Both interior and cover PDFs exist
- [ ] **PDFs Uploaded**: Files in Supabase Storage `book-pdfs` bucket
- [ ] **Signed URLs Created**: URLs valid for 24 hours
- [ ] **Signed URLs Accessible**: Test by visiting URLs in browser
- [ ] **Order JSON Valid**: All required fields present
- [ ] **Address Format Correct**: Uses stateCode, postalCode, countryCode
- [ ] **Shipping Level Set**: One of: MAIL, PRIORITY_MAIL, GROUND, EXPRESS
- [ ] **Email Valid**: Contact email provided
- [ ] **External ID Unique**: Each order has unique external_id

### Common Errors & Solutions

#### Error: "PDF dimensions invalid"
**Cause**: PDF not at correct dimensions with bleed
**Fix**: Ensure PDFs are 8.75" × 8.75" (interior) or calculated width × 8.75" (cover)

#### Error: "Low resolution image"
**Cause**: DPI below 300
**Fix**: Set viewport to full pixel dimensions (2625px) before rendering

#### Error: "Invalid printable_normalization"
**Cause**: Wrong JSON key names
**Fix**: Use `printable_normalization` → `cover` → `source_url`

#### Error: "Signed URL expired"
**Cause**: More than 24 hours passed since URL creation
**Fix**: Regenerate signed URLs before submitting order

#### Error: "Background images missing in PDF"
**Cause**: `printBackground` not set to true
**Fix**: Add `printBackground: true` to `page.pdf()` options

#### Error: "Fonts not embedded"
**Cause**: Web fonts not loading or system fonts missing
**Fix**: Use web-safe fonts or ensure Google Fonts load before PDF generation

## Testing Strategy

### 1. Unit Tests

Test individual functions:

```typescript
// Test spine calculation
Deno.test('Spine calculation for 32 pages', () => {
  const spine = calculateSpineWidth(32);
  assertEquals(spine, 0.072); // 32 × 0.00225
});

// Test cover dimensions
Deno.test('Cover dimensions for 32 pages', () => {
  const specs = getCoverPdfSpecs(32);
  assertEquals(specs.spineWidthInches, 0.072);
  assertEquals(specs.widthInches, 17.322);
  assertEquals(specs.heightInches, 8.75);
});
```

### 2. Integration Tests

Test full workflow:

```typescript
// Generate PDFs and validate
const interiorPdf = await generateInteriorPdf(testContent);
const coverPdf = await generateCoverPdf(testContent, 32);

// Check file sizes (PDFs should be > 100 KB)
assert(interiorPdf.length > 100000, 'Interior PDF too small');
assert(coverPdf.length > 100000, 'Cover PDF too small');
```

### 3. Sandbox Testing

Test with Lulu sandbox:

1. Set `LULU_USE_SANDBOX=true`
2. Use test Lulu credentials
3. Submit test order with real PDFs
4. Verify order appears in Lulu sandbox dashboard
5. Check that Lulu doesn't return errors

### 4. Production Smoke Test

Before going live:

1. Generate PDFs for sample book
2. Download and inspect PDFs locally
3. Upload to Lulu's Print-Ready File Checker (if available)
4. Submit one test order in production
5. Monitor order status in Lulu dashboard

## Pre-Flight Checklist

Before enabling for users:

- [ ] All environment variables set correctly
- [ ] Supabase Storage bucket `book-pdfs` created
- [ ] Storage policies allow service role upload/read
- [ ] Stripe webhook configured for checkout.session.completed
- [ ] Edge functions deployed: get-lulu-shipping, process-book-order
- [ ] Tested full flow in sandbox with test order
- [ ] PDF dimensions validated with ruler in Acrobat
- [ ] Signed URLs confirmed accessible for 24 hours
- [ ] Database triggers updating order status correctly
- [ ] Error handling and logging in place
- [ ] Cost monitoring enabled for storage/bandwidth

---

**Status**: Ready for implementation ✅
**Last Reviewed**: 2026-01-23
