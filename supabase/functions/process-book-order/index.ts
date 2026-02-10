/**
 * Process Book Order - Triggered after Stripe payment success
 * 
 * This function:
 * 1. Generates interior and cover PDFs using Puppeteer
 * 2. Uploads PDFs to Supabase Storage
 * 3. Generates signed URLs (24h expiry) for Lulu to download
 * 4. Submits order to Lulu API
 * 5. Updates book_orders table with Lulu order ID
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { LuluConfig, getLuluAccessToken, createLuluOrder, LuluOrderRequest } from '../_shared/lulu-api.ts';
import { generateInteriorPdf, generateCoverPdf, BookContent } from '../_shared/pdf-generator-production.ts';
import { LULU_PRODUCT_CODE } from '../_shared/pdf-specs.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LULU_SANDBOX_CLIENT_KEY = Deno.env.get('LULU_SANDBOX_CLIENT_KEY')!;
const LULU_SANDBOX_CLIENT_SECRET = Deno.env.get('LULU_SANDBOX_CLIENT_SECRET')!;
const LULU_PRODUCTION_CLIENT_KEY = Deno.env.get('LULU_PRODUCTION_CLIENT_KEY')!;
const LULU_PRODUCTION_CLIENT_SECRET = Deno.env.get('LULU_PRODUCTION_CLIENT_SECRET')!;
const LULU_USE_SANDBOX = Deno.env.get('LULU_USE_SANDBOX');

const SANDBOX_API_URL = 'https://api.sandbox.lulu.com';
const PRODUCTION_API_URL = 'https://api.lulu.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getLuluConfig(): LuluConfig {
  const useSandbox = LULU_USE_SANDBOX !== 'false';

  if (useSandbox) {
    return {
      clientKey: LULU_SANDBOX_CLIENT_KEY,
      clientSecret: LULU_SANDBOX_CLIENT_SECRET,
      apiUrl: SANDBOX_API_URL,
      environment: 'sandbox',
    };
  } else {
    return {
      clientKey: LULU_PRODUCTION_CLIENT_KEY,
      clientSecret: LULU_PRODUCTION_CLIENT_SECRET,
      apiUrl: PRODUCTION_API_URL,
      environment: 'production',
    };
  }
}

interface ProcessBookOrderRequest {
  bookOrderId: string;
}

// Helper to get signed URL from storage path
async function getSignedUrl(supabase: any, bucketName: string, path: string): Promise<string> {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, 60 * 60); // 1 hour expiry

  if (error || !data?.signedUrl) {
    console.error(`[process-book-order] Failed to get signed URL for ${bucketName}/${path}:`, error);
    return '';
  }
  return data.signedUrl;
}

Deno.serve(async (req) => {
  console.log('[process-book-order] Request received:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: ProcessBookOrderRequest = await req.json();
    console.log('[process-book-order] Processing order:', body.bookOrderId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Fetch book order details
    console.log('[process-book-order] Fetching book order...');
    const { data: bookOrder, error: orderError } = await supabase
      .from('book_orders')
      .select(`
        *,
        creations!inner(
          id,
          title,
          artist_name,
          artist_age,
          year,
          original_image_path,
          analysis_json,
          page_images
        )
      `)
      .eq('id', body.bookOrderId)
      .single();

    if (orderError || !bookOrder) {
      throw new Error(`Failed to fetch book order: ${orderError?.message}`);
    }

    console.log('[process-book-order] Order found:', bookOrder.id);

    // Check if already processed
    if (bookOrder.status !== 'pending' && bookOrder.status !== 'payment_received') {
      console.log('[process-book-order] Order already processed, skipping');
      return new Response(JSON.stringify({
        success: true,
        message: 'Order already processed',
        orderId: bookOrder.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to processing
    await supabase
      .from('book_orders')
      .update({ status: 'processing' })
      .eq('id', bookOrder.id);

    // Step 2: Prepare book content
    const creation = (bookOrder as any).creations;

    // Get signed URL for original image (stored in 'drawings' bucket)
    const originalImageUrl = await getSignedUrl(supabase, 'drawings', creation.original_image_path);
    const heroImageUrl = originalImageUrl; // Use same image for hero
    console.log('[process-book-order] Image URL:', originalImageUrl ? 'obtained' : 'MISSING');

    // Get story pages from analysis_json and replace imageUrls with signed URLs from page_images
    const rawPages = creation.analysis_json?.pages || [];
    const pageImagePaths: string[] = creation.page_images || [];

    // Generate signed URLs for each page image
    console.log('[process-book-order] Generating signed URLs for', pageImagePaths.length, 'page images...');
    const storyPages = await Promise.all(
      rawPages.map(async (page: { pageNumber: number; text: string; imageUrl: string }, index: number) => {
        const pagePath = pageImagePaths[index];
        let imageUrl = page.imageUrl; // fallback to original URL

        if (pagePath) {
          const signedUrl = await getSignedUrl(supabase, 'page-images', pagePath);
          if (signedUrl) {
            imageUrl = signedUrl;
            console.log(`[process-book-order] Page ${index + 1}: signed URL obtained`);
          } else {
            console.warn(`[process-book-order] Page ${index + 1}: failed to get signed URL, using fallback`);
          }
        } else {
          console.warn(`[process-book-order] Page ${index + 1}: no page_images path, using original imageUrl`);
        }

        return {
          pageNumber: page.pageNumber,
          text: page.text,
          imageUrl,
        };
      })
    );
    console.log('[process-book-order] Story pages prepared:', storyPages.length);

    const bookContent: BookContent = {
      title: creation.title || 'Untitled Story',
      artistName: creation.artist_name || 'Unknown Artist',
      age: creation.artist_age,
      year: creation.year,
      dedication: bookOrder.dedication_text || '',
      originalImageUrl,
      heroImageUrl,
      pages: storyPages,
    };

    console.log('[process-book-order] Book content prepared:', bookContent.title);

    // Step 3: Generate PDFs
    console.log('[process-book-order] Generating interior PDF...');
    const interiorPdf = await generateInteriorPdf(bookContent);
    
    console.log('[process-book-order] Generating cover PDF...');
    const hasDedication = bookContent.dedication ? 1 : 0;
    const rawCount = 1 + 1 + hasDedication + bookContent.pages.length + 1 + 1 + 1; // BelongsTo + Title + Dedication? + Story + TheEnd + AboutArtist + DrawHere
    const pageCount = rawCount % 2 === 0 ? rawCount : rawCount + 1; // +1 if odd (padding page)
    const coverPdf = await generateCoverPdf(bookContent, pageCount);

    // Step 4: Upload PDFs to Supabase Storage
    console.log('[process-book-order] Uploading PDFs to storage...');
    const timestamp = Date.now();
    const interiorPath = `books/${bookOrder.id}/interior-${timestamp}.pdf`;
    const coverPath = `books/${bookOrder.id}/cover-${timestamp}.pdf`;

    const { error: interiorUploadError } = await supabase.storage
      .from('book-pdfs')
      .upload(interiorPath, interiorPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (interiorUploadError) {
      throw new Error(`Failed to upload interior PDF: ${interiorUploadError.message}`);
    }

    const { error: coverUploadError } = await supabase.storage
      .from('book-pdfs')
      .upload(coverPath, coverPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (coverUploadError) {
      throw new Error(`Failed to upload cover PDF: ${coverUploadError.message}`);
    }

    console.log('[process-book-order] PDFs uploaded successfully');

    // Step 5: Generate signed URLs (24 hour expiry)
    console.log('[process-book-order] Generating signed URLs...');
    const { data: interiorSignedUrl } = await supabase.storage
      .from('book-pdfs')
      .createSignedUrl(interiorPath, 86400); // 24 hours

    const { data: coverSignedUrl } = await supabase.storage
      .from('book-pdfs')
      .createSignedUrl(coverPath, 86400);

    if (!interiorSignedUrl?.signedUrl || !coverSignedUrl?.signedUrl) {
      throw new Error('Failed to generate signed URLs');
    }

    console.log('[process-book-order] Signed URLs generated');

    // Step 6: Submit order to Lulu
    console.log('[process-book-order] Submitting order to Lulu...');
    const luluConfig = getLuluConfig();
    const accessToken = await getLuluAccessToken(luluConfig);

    // Validate shipping information
    if (!bookOrder.shipping_name || !bookOrder.shipping_address || !bookOrder.shipping_city || 
        !bookOrder.shipping_state || !bookOrder.shipping_zip) {
      throw new Error('Missing required shipping information');
    }

    const luluOrderRequest: LuluOrderRequest = {
      line_items: [
        {
          external_id: bookOrder.id,
          printable_normalization: {
            cover: {
              source_url: coverSignedUrl.signedUrl,
            },
            interior: {
              source_url: interiorSignedUrl.signedUrl,
            },
          },
          quantity: 1,
          title: bookContent.title,
        },
      ],
      shipping_address: {
        name: bookOrder.shipping_name,
        street1: bookOrder.shipping_address,
        street2: bookOrder.shipping_address2 || undefined,
        city: bookOrder.shipping_city,
        stateCode: bookOrder.shipping_state,
        postalCode: bookOrder.shipping_zip,
        countryCode: bookOrder.shipping_country || 'US',
        phoneNumber: bookOrder.shipping_phone || undefined,
        email: bookOrder.shipping_email || bookOrder.contact_email,
      },
      shipping_option_level: bookOrder.shipping_level_id || 'MAIL', // Use stored shipping level
      contact_email: bookOrder.shipping_email || bookOrder.contact_email,
    };

    console.log('[process-book-order] Lulu order request:', {
      externalId: bookOrder.id,
      title: bookContent.title,
      shippingLevel: bookOrder.shipping_level_id || 'MAIL',
      shippingAddress: `${bookOrder.shipping_city}, ${bookOrder.shipping_state}`,
    });

    const luluOrder = await createLuluOrder(luluConfig, accessToken, luluOrderRequest);

    console.log('[process-book-order] Lulu order created:', luluOrder.id);

    // Step 7: Update book order with Lulu order ID
    await supabase
      .from('book_orders')
      .update({
        status: 'printed',
        lulu_order_id: luluOrder.id.toString(),
      })
      .eq('id', bookOrder.id);

    console.log('[process-book-order] Book order updated successfully');

    return new Response(JSON.stringify({
      success: true,
      bookOrderId: bookOrder.id,
      luluOrderId: luluOrder.id,
      environment: luluConfig.environment,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[process-book-order] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process book order',
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
