/**
 * Book Configuration
 * 
 * Supports multiple book types (Softcover and Hardcover)
 */

export const FIXED_PAGE_COUNT = 32; // Must be even number, minimum 24

// Validate page count
if (FIXED_PAGE_COUNT % 2 !== 0) {
  throw new Error('FIXED_PAGE_COUNT must be even for binding');
}

if (FIXED_PAGE_COUNT < 24) {
  throw new Error('Minimum page count is 24 pages');
}

if (FIXED_PAGE_COUNT > 800) {
  throw new Error('Maximum page count is 800 pages');
}

/**
 * Book type enum
 */
export enum BookType {
  SOFTCOVER = 'softcover',
  HARDCOVER = 'hardcover',
}

/**
 * Book type configuration interface
 */
export interface BookTypeConfig {
  type: BookType;
  productCode: string;
  displayName: string;
  pageThickness: number; // inches per page
  bindingType: string;
  description: string;
  stripePriceKey: string; // Key for fetching price from get-book-prices API
}

/**
 * Available book types with their Lulu product codes and specifications
 */
export const BOOK_TYPES: Record<BookType, BookTypeConfig> = {
  [BookType.SOFTCOVER]: {
    type: BookType.SOFTCOVER,
    productCode: '0850X0850FCPRESS060UW444MXX',
    displayName: 'Softcover Perfect Bound',
    pageThickness: 0.00225, // inches per page for 60# paper
    bindingType: 'PERFECT_BOUND',
    description: '8.5" × 8.5" Square, Perfect Bound, Matte Cover',
    stripePriceKey: 'softcover', // Fetch price from get-book-prices API
  },
  [BookType.HARDCOVER]: {
    type: BookType.HARDCOVER,
    productCode: '0850X0850FCPRECW060UW444MXX',
    displayName: 'Hardcover Casewrap',
    pageThickness: 0.00225, // inches per page for 60# paper
    bindingType: 'CASEWRAP',
    description: '8.5" × 8.5" Square, Casewrap Hardcover, Premium Color',
    stripePriceKey: 'hardcover', // Fetch price from get-book-prices API
  },
};

/**
 * Get book type configuration
 */
export function getBookTypeConfig(type: BookType): BookTypeConfig {
  const config = BOOK_TYPES[type];
  if (!config) {
    throw new Error(`Unknown book type: ${type}`);
  }
  return config;
}

/**
 * Get book type by product code
 */
export function getBookTypeByProductCode(productCode: string): BookTypeConfig | undefined {
  return Object.values(BOOK_TYPES).find(config => config.productCode === productCode);
}

/**
 * Calculate the actual page count from your story content
 */
export function calculateRequiredPages(storyPageCount: number): number {
  // Title page (1)
  // Dedication page (1)
  // Story pages: each story spread = 1 image page + 1 text page
  const storyPages = storyPageCount * 2;
  // "The End" page (1)
  // "About the Artist" page (1)
  
  const totalUsedPages = 1 + 1 + storyPages + 1 + 1;
  
  // Round up to next even number
  const requiredPages = Math.ceil(totalUsedPages / 2) * 2;
  
  // Ensure minimum of 24 pages
  return Math.max(24, requiredPages);
}

/**
 * Cover color options
 */
export interface CoverColor {
  id: string;
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
}

export const COVER_COLORS: CoverColor[] = [
  { id: 'soft-blue', name: 'Soft Blue', hex: '#E0F2FE', rgb: { r: 0.878, g: 0.949, b: 0.996 } },
  { id: 'cream', name: 'Cream', hex: '#FEF9E7', rgb: { r: 0.996, g: 0.976, b: 0.906 } },
  { id: 'sage', name: 'Sage', hex: '#D5E8D4', rgb: { r: 0.835, g: 0.910, b: 0.831 } },
  { id: 'blush', name: 'Blush', hex: '#FCE4EC', rgb: { r: 0.988, g: 0.894, b: 0.925 } },
  { id: 'lavender', name: 'Lavender', hex: '#E8DEF8', rgb: { r: 0.910, g: 0.871, b: 0.973 } },
  { id: 'buttercup', name: 'Buttercup', hex: '#FFF9C4', rgb: { r: 1.0, g: 0.976, b: 0.769 } },
];

export const DEFAULT_COVER_COLOR = COVER_COLORS[0]; // Soft Blue

export function getCoverColorById(id: string): CoverColor {
  return COVER_COLORS.find(c => c.id === id) || DEFAULT_COVER_COLOR;
}

/**
 * Default book config (for backward compatibility)
 */
export const BOOK_CONFIG = {
  pageCount: FIXED_PAGE_COUNT,
  productCode: BOOK_TYPES[BookType.SOFTCOVER].productCode,
  format: '8.5" x 8.5" Square',
  binding: 'Perfect Bound',
  paper: '60# Uncoated White',
  cover: 'Matte',
} as const;
