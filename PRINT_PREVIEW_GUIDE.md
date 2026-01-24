# Print Preview & Test Feature Guide

## Overview

The Print Preview feature allows admins to generate and inspect print-ready PDFs **without submitting orders to Lulu**. This is essential for testing your PDF generation before going live.

## How It Works

1. **Admin Dashboard** → Navigate to "🖨️ Print Preview" tab
2. **Select a Creation** → Click "Generate Preview" for any story
3. **PDFs Generated** → Interior and cover PDFs created using Puppeteer
4. **PDFs Uploaded** → Files stored in `book-pdfs/previews/` folder
5. **Download Links** → 7-day signed URLs provided for inspection
6. **Specs Displayed** → View exact dimensions, spine width, DPI, etc.

## Features

### ✅ What It Does

- **Generates Real PDFs**: Uses the same PDF generator as live orders
- **No Lulu Submission**: PDFs are created but NOT sent to Lulu
- **Download & Inspect**: Get signed URLs to download PDFs
- **Print Specs Summary**: See exact dimensions, spine width, DPI
- **Safety Checks**: Clear messaging that this is preview-only

### 🔐 Security

- **Admin Only**: Requires authentication with admin email (`team@sproutify.app`)
- **JWT Verification**: Edge function validates admin access
- **Private Storage**: PDFs stored in private Supabase bucket

## Usage

### Step 1: Deploy the Function

```bash
supabase functions deploy generate-book-preview
```

### Step 2: Access Admin Dashboard

1. Navigate to your app
2. Go to Admin section
3. Log in with admin credentials

### Step 3: Generate Preview

1. Click "🖨️ Print Preview" tab
2. Find the creation you want to test
3. Click "Generate Preview" button
4. Wait 10-30 seconds for generation

### Step 4: Download & Inspect

1. Click "📄 Interior PDF" to download
2. Click "📕 Cover PDF" to download
3. Open PDFs in Adobe Acrobat or similar
4. Verify specifications match expectations

## What to Check

### Interior PDF Checklist

- [ ] **Dimensions**: Should be exactly 8.75" × 8.75"
- [ ] **Resolution**: Check document properties shows 2625px × 2625px
- [ ] **DPI**: Should be 300 DPI (not 72)
- [ ] **Bleed**: Images should extend to all edges
- [ ] **Safe Area**: Text should be 0.125" from edges
- [ ] **Pages**: Count matches expected page count
- [ ] **Content**: All story pages, images, text rendered correctly

### Cover PDF Checklist

- [ ] **Width**: Calculated correctly (see specs summary)
- [ ] **Height**: Should be 8.75"
- [ ] **Spine Width**: Matches calculation (page_count × 0.00225")
- [ ] **Layout**: Back cover, spine, front cover visible
- [ ] **Title/Author**: Visible and properly positioned
- [ ] **Bleed**: Cover image extends to edges

### Print Specs Summary

The preview results show:

```
Format: 8.5" × 8.5" Square
Binding: Perfect Bound
Pages: 32
Spine Width: 0.0720"
Interior Size: 8.75" × 8.75"
Cover Size: 17.322" × 8.75"
DPI: 300
Bleed: 0.125" on all sides
```

**Verify** that:
- Spine width calculation is correct
- Cover width = (8.5 + spine + 8.5 + 0.25)
- All dimensions match Lulu requirements

## Troubleshooting

### Issue: "Unauthorized: Admin access required"

**Solution**: Ensure you're logged in with the admin email (`team@sproutify.app`)

### Issue: PDFs not generating

**Check:**
1. Edge function deployed: `supabase functions list`
2. Storage bucket exists: `book-pdfs`
3. Creation has valid data (images, pages, etc.)
4. Check function logs: Supabase Dashboard → Functions → Logs

### Issue: Download links expired

**Solution**: Links expire after 7 days. Click "Generate Preview" again to create new links.

### Issue: PDFs look wrong

**Check:**
1. **Low resolution**: Verify DPI is 300 in PDF properties
2. **Missing bleed**: Check images extend to edges
3. **Wrong dimensions**: Compare with specs summary
4. **Text cut off**: Ensure text stays within safe area

## Storage Management

### Preview Files Location

```
book-pdfs/
  └── previews/
      └── {creation-id}/
          ├── {title}-interior-{timestamp}.pdf
          └── {title}-cover-{timestamp}.pdf
```

### Cleanup Old Previews

Preview PDFs accumulate over time. Periodically clean up old files:

```sql
-- In Supabase SQL Editor
SELECT 
  name,
  created_at,
  metadata->>'size' as size_bytes
FROM storage.objects
WHERE bucket_id = 'book-pdfs' 
  AND name LIKE 'previews/%'
ORDER BY created_at DESC;
```

Delete manually through Supabase Dashboard → Storage → book-pdfs → previews

## Cost Estimates

### Per Preview Generation

- **Edge Function**: ~5-15 seconds compute = $0.001
- **Storage**: ~2-5 MB per preview = $0.02/month
- **Bandwidth**: ~5 MB per download = $0.09/GB

**Estimated cost**: Less than $0.05 per preview

## API Reference

### Edge Function: `generate-book-preview`

**Endpoint**: `POST /functions/v1/generate-book-preview`

**Headers**:
```
Authorization: Bearer {jwt-token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "creationId": "uuid-of-creation"
}
```

**Response** (Success):
```json
{
  "success": true,
  "creation": {
    "id": "...",
    "title": "My Story",
    "artistName": "Artist Name"
  },
  "pdfs": {
    "interior": {
      "url": "https://...signedUrl",
      "sizeMB": 2.45
    },
    "cover": {
      "url": "https://...signedUrl",
      "sizeMB": 1.23
    }
  },
  "specs": {
    "pageCount": 32,
    "format": "8.5\" × 8.5\" Square",
    "interior": {
      "dimensions": "8.75\" × 8.75\"",
      "resolution": "2625px × 2625px",
      "dpi": 300,
      "bleed": "0.125\" on all sides"
    },
    "cover": {
      "dimensions": "17.322\" × 8.75\"",
      "spineWidth": "0.0720\"",
      "layout": "Back (8.5\") + Spine (0.072\") + Front (8.5\") + Bleed (0.25\")"
    }
  },
  "expiresAt": "2026-01-30T12:00:00.000Z",
  "note": "These are preview PDFs only. No order has been submitted to Lulu."
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Failed to generate preview PDFs",
  "details": "Error message here"
}
```

## Integration with Workflow

### Before Going Live

1. **Test with Sample Creation**
   - Generate preview for test story
   - Download both PDFs
   - Inspect in Adobe Acrobat
   - Verify all specifications

2. **Validate Calculations**
   - Check spine width formula
   - Verify cover width calculation
   - Confirm bleed is correct

3. **Review with Team**
   - Share PDFs with stakeholders
   - Get approval on quality
   - Make adjustments if needed

### During Development

- Generate previews frequently while developing PDF templates
- Test different page counts to verify spine calculation
- Validate edge cases (long titles, special characters, etc.)

### After Launch

- Generate preview before fulfilling unusual orders
- Use for debugging customer issues
- Verify PDF quality if Lulu rejects an order

## Best Practices

1. **Test Different Stories**: Generate previews for stories with varying:
   - Page counts
   - Title lengths
   - Image types
   - Special characters

2. **Keep Recent Previews**: Don't delete immediately - useful for comparison

3. **Document Issues**: If you find PDF problems, note them for fixing

4. **Share with Print Provider**: Send test PDFs to Lulu support for validation

5. **Regular Testing**: Generate preview monthly to catch any regressions

## Limitations

- **No Lulu Validation**: PDFs not validated by Lulu API
- **No Order Submission**: Doesn't test full order flow
- **Manual Inspection**: You must manually review PDFs
- **Storage Costs**: Old previews accumulate storage costs

## Next Steps

1. **Generate First Preview**: Test with a sample creation
2. **Inspect PDFs**: Verify dimensions and quality
3. **Fix Issues**: Update PDF generator if needed
4. **Test Live Order**: After preview looks good, test with real Lulu sandbox order

---

**Pro Tip**: Generate previews in Lulu sandbox environment first, then switch to production once validated. This ensures your PDFs meet Lulu's requirements before charging customers.

## Need Help?

- **Check logs**: Supabase Dashboard → Functions → generate-book-preview → Logs
- **Test function**: Use curl to test API directly
- **Review specs**: Compare with `PRINT_READY_CHECKLIST.md`
- **Contact support**: Share preview PDFs with your print provider

---

**Status**: ✅ Ready to Use
**Last Updated**: 2026-01-23
