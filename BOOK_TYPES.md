# Book Types Configuration

## Overview

The system now supports **two book types**:
1. **Softcover** (Perfect Bound)
2. **Hardcover** (Casewrap)

## Product Codes

### Softcover
- **Product Code**: `0850X0850FCPRESS060UW444MXX`
- **Binding**: Perfect Bound (444)
- **Display Name**: "Softcover Perfect Bound"
- **Cover**: Matte
- **Price**: $34.99

### Hardcover
- **Product Code**: `0850X0850FCPRECW060UW444MXX`
- **Binding**: Casewrap Hardcover (CW)
- **Display Name**: "Hardcover Casewrap"
- **Cover**: Premium Color Casewrap
- **Price**: $49.99

## Specifications

### Common Specs (Both Types)
- **Trim Size**: 8.5" × 8.5" Square
- **Paper**: 60# Uncoated White (060UW)
- **Color**: Full Color (FC)
- **Page Thickness**: 0.00225" per page
- **Min Pages**: 24
- **Max Pages**: 800
- **DPI**: 300

### Spine Calculation
Both book types use the same spine calculation:
```
spine_width = page_count × 0.00225"
```

For 32 pages:
```
spine_width = 32 × 0.00225" = 0.0720"
```

## Cover Dimensions

### Interior PDF (Same for Both)
- **With Bleed**: 8.75" × 8.75"
- **Trim Size**: 8.5" × 8.5"
- **Bleed**: 0.125" on all sides

### Cover PDF (Same for Both)
- **Width**: Back (8.5") + Spine (0.0720") + Front (8.5") + Bleed (0.25") = **17.322"**
- **Height**: 8.5" + Bleed (0.25") = **8.75"**

## Usage

### Admin Dashboard
1. Go to the **Print Preview** tab
2. Select book type from dropdown:
   - 📘 Softcover ($34.99)
   - 📕 Hardcover ($49.99)
3. Click "Generate Preview"
4. Download and inspect PDFs

### API Usage
```typescript
// Generate preview with book type
const { data } = await supabase.functions.invoke('generate-book-preview', {
  body: {
    creationId: 'uuid',
    bookType: 'hardcover' // or 'softcover'
  }
});
```

### Code Configuration
Book types are defined in `supabase/functions/_shared/book-config.ts`:

```typescript
export enum BookType {
  SOFTCOVER = 'softcover',
  HARDCOVER = 'hardcover',
}

export const BOOK_TYPES: Record<BookType, BookTypeConfig> = {
  [BookType.SOFTCOVER]: {
    type: BookType.SOFTCOVER,
    productCode: '0850X0850FCPRESS060UW444MXX',
    displayName: 'Softcover Perfect Bound',
    pageThickness: 0.00225,
    bindingType: 'PERFECT_BOUND',
    description: '8.5" × 8.5" Square, Perfect Bound, Matte Cover',
    price: 3499, // cents
  },
  [BookType.HARDCOVER]: {
    type: BookType.HARDCOVER,
    productCode: '0850X0850FCPRECW060UW444MXX',
    displayName: 'Hardcover Casewrap',
    pageThickness: 0.00225,
    bindingType: 'CASEWRAP',
    description: '8.5" × 8.5" Square, Casewrap Hardcover, Premium Color',
    price: 4999, // cents
  },
};
```

## PDF Design Differences

### Softcover
- **Back Cover**: Soft pastel blue (#E0F2FE)
- **Spine**: Dark gray with white text
- **Front Cover**: Hero image with title overlay

### Hardcover
- Same design as softcover (currently)
- Can be customized in `pdf-generator-production.ts`
- Consider adding premium elements:
  - Gold foil effects (simulated)
  - Embossed title (simulated)
  - Different color scheme

## Testing

1. **Generate Preview**: Test both book types from admin dashboard
2. **Check Spine Width**: Verify spine calculation in PDF specs
3. **Verify Product Code**: Check that correct Lulu code is used
4. **Inspect PDFs**: Download and check:
   - Dimensions are correct
   - Bleed is present
   - Text doesn't overlap spine area
   - Images are high resolution

## Next Steps for Production

### For Book Purchase Flow
Update `BookPurchaseModal.tsx` to:
1. Show both book type options
2. Display different prices
3. Pass `bookType` to checkout function

### For Stripe Checkout
Update `create-book-checkout` function to:
1. Accept `bookType` parameter
2. Use correct price from `BOOK_TYPES` config
3. Store `bookType` in `book_orders` table

### For Lulu Order Submission
Update `process-book-order` function to:
1. Fetch `bookType` from `book_orders` table
2. Pass `bookType` to PDF generator
3. Use correct product code for Lulu API

## Pricing Notes

**Adjust these prices based on your actual costs:**
- Lulu manufacturing cost
- Shipping costs
- Your profit margin
- Market research

Current prices in the code:
- Softcover: $34.99
- Hardcover: $49.99 (example - adjust as needed)
