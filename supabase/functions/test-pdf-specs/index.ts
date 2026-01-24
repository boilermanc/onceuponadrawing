/**
 * Test PDF Specifications
 * 
 * Run this function to validate your PDF specs are correct
 * 
 * Usage:
 *   curl -X POST https://your-project.supabase.co/functions/v1/test-pdf-specs
 */

import { 
  getInteriorPdfSpecs, 
  getCoverPdfSpecs,
  calculateSpineWidth,
  LULU_PRODUCT_CODE,
  BOOK_WIDTH,
  BOOK_HEIGHT,
  BLEED_SIZE,
  PRINT_DPI,
} from '../_shared/pdf-specs.ts';

import { FIXED_PAGE_COUNT } from '../_shared/book-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function runTests() {
  const results: any = {
    success: true,
    tests: [],
    summary: {},
  };

  // Test 1: Interior PDF Specs
  console.log('Testing interior PDF specs...');
  const interior = getInteriorPdfSpecs();
  
  results.tests.push({
    name: 'Interior Dimensions',
    expected: '8.75" × 8.75"',
    actual: `${interior.widthInches}" × ${interior.heightInches}"`,
    pass: interior.widthInches === 8.75 && interior.heightInches === 8.75,
  });

  results.tests.push({
    name: 'Interior Resolution',
    expected: '2625px × 2625px',
    actual: `${interior.widthPixels}px × ${interior.heightPixels}px`,
    pass: interior.widthPixels === 2625 && interior.heightPixels === 2625,
  });

  results.tests.push({
    name: 'Interior DPI',
    expected: '300',
    actual: interior.dpi.toString(),
    pass: interior.dpi === 300,
  });

  // Test 2: Spine Calculation
  console.log('Testing spine calculation...');
  const spineWidth = calculateSpineWidth(FIXED_PAGE_COUNT);
  const expectedSpine = FIXED_PAGE_COUNT * 0.00225;

  results.tests.push({
    name: 'Spine Width Calculation',
    expected: `${expectedSpine.toFixed(4)}"`,
    actual: `${spineWidth.toFixed(4)}"`,
    pass: Math.abs(spineWidth - expectedSpine) < 0.0001,
  });

  // Test 3: Cover PDF Specs
  console.log('Testing cover PDF specs...');
  const cover = getCoverPdfSpecs(FIXED_PAGE_COUNT);
  const expectedCoverWidth = BOOK_WIDTH + spineWidth + BOOK_WIDTH + (BLEED_SIZE * 2);
  const expectedCoverHeight = BOOK_HEIGHT + (BLEED_SIZE * 2);

  results.tests.push({
    name: 'Cover Height',
    expected: `${expectedCoverHeight}"`,
    actual: `${cover.heightInches}"`,
    pass: cover.heightInches === expectedCoverHeight,
  });

  results.tests.push({
    name: 'Cover Width',
    expected: `${expectedCoverWidth.toFixed(4)}"`,
    actual: `${cover.widthInches.toFixed(4)}"`,
    pass: Math.abs(cover.widthInches - expectedCoverWidth) < 0.0001,
  });

  results.tests.push({
    name: 'Cover Spine Width',
    expected: `${expectedSpine.toFixed(4)}"`,
    actual: `${cover.spineWidthInches.toFixed(4)}"`,
    pass: Math.abs(cover.spineWidthInches - expectedSpine) < 0.0001,
  });

  // Test 4: Bleed Validation
  results.tests.push({
    name: 'Bleed Size',
    expected: '0.125"',
    actual: `${BLEED_SIZE}"`,
    pass: BLEED_SIZE === 0.125,
  });

  // Test 5: DPI Validation
  results.tests.push({
    name: 'Print DPI',
    expected: '300',
    actual: `${PRINT_DPI}`,
    pass: PRINT_DPI === 300,
  });

  // Test 6: Page Count Validation
  results.tests.push({
    name: 'Page Count is Even',
    expected: 'true',
    actual: (FIXED_PAGE_COUNT % 2 === 0).toString(),
    pass: FIXED_PAGE_COUNT % 2 === 0,
  });

  results.tests.push({
    name: 'Page Count >= 24',
    expected: 'true',
    actual: (FIXED_PAGE_COUNT >= 24).toString(),
    pass: FIXED_PAGE_COUNT >= 24,
  });

  // Summary
  const totalTests = results.tests.length;
  const passedTests = results.tests.filter((t: any) => t.pass).length;
  const failedTests = totalTests - passedTests;

  results.summary = {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    passRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
  };

  results.success = failedTests === 0;

  // Detailed specs for reference
  results.specifications = {
    product: LULU_PRODUCT_CODE,
    pageCount: FIXED_PAGE_COUNT,
    interior: {
      widthInches: interior.widthInches,
      heightInches: interior.heightInches,
      widthPixels: interior.widthPixels,
      heightPixels: interior.heightPixels,
      dpi: interior.dpi,
      bleed: BLEED_SIZE,
      trimSize: `${BOOK_WIDTH}" × ${BOOK_HEIGHT}"`,
    },
    cover: {
      widthInches: cover.widthInches,
      heightInches: cover.heightInches,
      widthPixels: cover.widthPixels,
      heightPixels: cover.heightPixels,
      dpi: cover.dpi,
      spineWidthInches: cover.spineWidthInches,
      layout: {
        leftBleed: BLEED_SIZE,
        backCoverWidth: cover.backCoverWidthInches,
        spineWidth: cover.spineWidthInches,
        frontCoverWidth: cover.frontCoverWidthInches,
        rightBleed: BLEED_SIZE,
        totalWidth: cover.widthInches,
      },
    },
  };

  return results;
}

Deno.serve(async (req) => {
  console.log('[test-pdf-specs] Request received:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[test-pdf-specs] Running PDF spec tests...');
    const results = runTests();

    console.log('[test-pdf-specs] Tests completed');
    console.log(`[test-pdf-specs] Results: ${results.summary.passed}/${results.summary.total} passed`);

    if (!results.success) {
      console.error('[test-pdf-specs] Some tests failed!');
      results.tests
        .filter((t: any) => !t.pass)
        .forEach((t: any) => {
          console.error(`  ❌ ${t.name}: Expected ${t.expected}, got ${t.actual}`);
        });
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: results.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[test-pdf-specs] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Test execution failed',
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
