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
          age,
          year,
          dedication_text,
          original_image_url,
          hero_image_url,
          story_pages
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
    const bookContent: BookContent = {
      title: creation.title,
      artistName: creation.artist_name,
      age: creation.age,
      year: creation.year,
      dedication: bookOrder.dedication_text || creation.dedication_text,
      originalImageUrl: creation.original_image_url,
      heroImageUrl: creation.hero_image_url,
      pages: creation.story_pages || [],
    };

    console.log('[process-book-order] Book content prepared:', bookContent.title);

    // Step 3: Generate PDFs
    console.log('[process-book-order] Generating interior PDF...');
    const interiorPdf = await generateInteriorPdf(bookContent);
    
    console.log('[process-book-order] Generating cover PDF...');
    const pageCount = bookContent.pages.length * 2 + 6; // Approximate page count
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
