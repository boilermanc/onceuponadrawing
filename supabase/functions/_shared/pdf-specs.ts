/**
 * PDF Specifications and Calculations for Lulu xPress API
 * 
 * Supports multiple book types:
 * - Softcover: 0850X0850FCPRESS060UW444MXX
 * - Hardcover: 0850X0850FCPRECW060UW444MXX
 * 
 * Format: 8.5" x 8.5" Square
 * Paper: 060UW (60# Uncoated White)
 */

import { BookType, getBookTypeConfig } from './book-config.ts';

// Default product code for backward compatibility
export const LULU_PRODUCT_CODE = '0850X0850FCPRESS060UW444MXX';

// Paper thickness for spine calculation (inches per page)
// Lulu uses ~0.00225" per page for 60# Uncoated White paper
export const PAGE_THICKNESS_INCHES = 0.00225;

// Book dimensions (inches)
export const BOOK_WIDTH = 8.5;
export const BOOK_HEIGHT = 8.5;

// Bleed requirements (inches)
export const BLEED_SIZE = 0.125; // 1/8" on all sides
export const COVER_BLEED_TOTAL = 0.25; // 1/4" total for wrap-around cover

// DPI settings for print quality
export const PRINT_DPI = 300; // Standard print quality

/**
 * Interior PDF Specifications
 * Must include bleed on all sides
 */
export interface InteriorPdfSpecs {
  widthInches: number;
  heightInches: number;
  widthPixels: number;
  heightPixels: number;
  dpi: number;
}

export function getInteriorPdfSpecs(): InteriorPdfSpecs {
  // Interior pages need bleed on all sides
  const widthInches = BOOK_WIDTH + (BLEED_SIZE * 2); // 8.75"
  const heightInches = BOOK_HEIGHT + (BLEED_SIZE * 2); // 8.75"
  
  return {
    widthInches,
    heightInches,
    widthPixels: Math.round(widthInches * PRINT_DPI), // 2625px
    heightPixels: Math.round(heightInches * PRINT_DPI), // 2625px
    dpi: PRINT_DPI,
  };
}

/**
 * Calculate spine width based on page count and book type
 * Formula: spine_width = page_count × page_thickness
 * 
 * @param pageCount Total number of interior pages (must be even)
 * @param bookType Optional book type (defaults to SOFTCOVER)
 * @returns Spine width in inches
 */
export function calculateSpineWidth(pageCount: number, bookType: BookType = BookType.SOFTCOVER): number {
  if (pageCount % 2 !== 0) {
    throw new Error('Page count must be even for binding');
  }
  
  if (pageCount < 24) {
    throw new Error('Minimum page count is 24 pages');
  }
  
  if (pageCount > 800) {
    throw new Error('Maximum page count is 800 pages');
  }
  
  const config = getBookTypeConfig(bookType);
  return pageCount * config.pageThickness;
}

/**
 * Cover PDF Specifications
 * Perfect Bound cover = Back Cover + Spine + Front Cover + Bleed
 */
export interface CoverPdfSpecs {
  widthInches: number;
  heightInches: number;
  widthPixels: number;
  heightPixels: number;
  dpi: number;
  spineWidthInches: number;
  backCoverWidthInches: number;
  frontCoverWidthInches: number;
}

export function getCoverPdfSpecs(pageCount: number, bookType: BookType = BookType.SOFTCOVER): CoverPdfSpecs {
  const spineWidthInches = calculateSpineWidth(pageCount, bookType);
  
  // Cover width = Back (8.5") + Spine + Front (8.5") + Bleed (0.25" total)
  const widthInches = (BOOK_WIDTH * 2) + spineWidthInches + COVER_BLEED_TOTAL;
  
  // Cover height = Book height (8.5") + Bleed (0.25" total)
  const heightInches = BOOK_HEIGHT + COVER_BLEED_TOTAL;
  
  return {
    widthInches,
    heightInches,
    widthPixels: Math.round(widthInches * PRINT_DPI),
    heightPixels: Math.round(heightInches * PRINT_DPI),
    dpi: PRINT_DPI,
    spineWidthInches,
    backCoverWidthInches: BOOK_WIDTH,
    frontCoverWidthInches: BOOK_WIDTH,
  };
}

/**
 * Puppeteer page settings for PDF generation
 */
export function getPuppeteerPageSettings(specs: InteriorPdfSpecs | CoverPdfSpecs) {
  return {
    width: `${specs.widthInches}in`,
    height: `${specs.heightInches}in`,
    printBackground: true,
    preferCSSPageSize: true,
  };
}

/**
 * Puppeteer viewport settings for rendering
 */
export function getPuppeteerViewport(specs: InteriorPdfSpecs | CoverPdfSpecs) {
  return {
    width: specs.widthPixels,
    height: specs.heightPixels,
    deviceScaleFactor: 1,
  };
}

/**
 * Example usage and validation
 */
export function validateSpecs() {
  // Example: 32-page book (typical children's book)
  const pageCount = 32;
  
  const interior = getInteriorPdfSpecs();
  console.log('Interior PDF Specs:', interior);
  // Output: 8.75" x 8.75" (2625px x 2625px @ 300 DPI)
  
  const cover = getCoverPdfSpecs(pageCount);
  console.log('Cover PDF Specs:', cover);
  // Output: ~17.32" x 8.75" (spine = 0.072" for 32 pages)
  
  return { interior, cover };
}
