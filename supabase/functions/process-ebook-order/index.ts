/**
 * Process Ebook Order — Triggered after Stripe payment for digital storybook
 *
 * This function:
 * 1. Fetches the book order and creation data
 * 2. Generates a single ebook PDF (front cover + interior + back cover)
 * 3. Uploads to Supabase Storage
 * 4. Creates a signed download URL (7-day expiry)
 * 5. Updates order with download URL and status = 'completed'
 * 6. Sends delivery email with download link
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateEbookPdf } from '../_shared/pdf-generator-ebook.ts';
import { BookContent } from '../_shared/pdf-generator-production.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DOWNLOAD_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface ProcessEbookOrderRequest {
  bookOrderId: string;
}

Deno.serve(async (req) => {
  console.log('[process-ebook-order] Request received:', req.method);

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
    const body: ProcessEbookOrderRequest = await req.json();
    console.log('[process-ebook-order] Processing ebook order:', body.bookOrderId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Fetch book order with creation details
    console.log('[process-ebook-order] Fetching book order...');
    const { data: bookOrder, error: orderError } = await supabase
      .from('book_orders')
      .select(`
        *,
        creations!inner(
          id, title, artist_name, age, year,
          dedication_text, original_image_url, hero_image_url, story_pages
        )
      `)
      .eq('id', body.bookOrderId)
      .single();

    if (orderError || !bookOrder) {
      throw new Error(`Failed to fetch book order: ${orderError?.message}`);
    }

    console.log('[process-ebook-order] Order found:', bookOrder.id, 'type:', bookOrder.order_type);

    // Verify this is an ebook order
    if (bookOrder.order_type !== 'ebook') {
      console.log('[process-ebook-order] Not an ebook order, skipping');
      return new Response(JSON.stringify({
        success: false,
        error: 'Not an ebook order',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already processed
    if (bookOrder.status === 'completed' && bookOrder.download_url) {
      console.log('[process-ebook-order] Order already completed with download URL');
      return new Response(JSON.stringify({
        success: true,
        message: 'Order already processed',
        downloadUrl: bookOrder.download_url,
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

    console.log('[process-ebook-order] Generating ebook PDF for:', bookContent.title);

    // Step 3: Generate ebook PDF
    const ebookPdf = await generateEbookPdf(bookContent, {
      coverColorId: bookOrder.cover_color_id || 'soft-blue',
      textColorId: bookOrder.text_color_id || 'gunmetal',
    });

    console.log('[process-ebook-order] PDF generated:', ebookPdf.length, 'bytes');

    // Step 4: Upload to storage
    const timestamp = Date.now();
    const safeTitle = bookContent.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
    const storagePath = `ebooks/${bookOrder.id}/${safeTitle}-${timestamp}.pdf`;

    console.log('[process-ebook-order] Uploading to storage:', storagePath);
    const { error: uploadError } = await supabase.storage
      .from('book-pdfs')
      .upload(storagePath, ebookPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload ebook PDF: ${uploadError.message}`);
    }

    // Step 5: Create signed download URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('book-pdfs')
      .createSignedUrl(storagePath, DOWNLOAD_URL_EXPIRY_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(`Failed to generate download URL: ${signedUrlError?.message}`);
    }

    const downloadUrl = signedUrlData.signedUrl;
    console.log('[process-ebook-order] Download URL generated');

    // Step 6: Update order — completed with download info
    const { error: updateError } = await supabase
      .from('book_orders')
      .update({
        status: 'completed',
        download_url: downloadUrl,
        download_path: storagePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', bookOrder.id);

    if (updateError) {
      console.error('[process-ebook-order] Failed to update order:', updateError);
      // Don't throw — PDF is already uploaded, we can recover
    }

    // Step 7: Send delivery email with download link
    const recipientEmail = bookOrder.contact_email || bookOrder.shipping_email;
    if (recipientEmail) {
      console.log('[process-ebook-order] Sending delivery email to:', recipientEmail);
      fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_key: 'ebook_delivery',
          recipient_email: recipientEmail,
          variables: {
            customer_name: bookOrder.billing_name || bookOrder.shipping_name || 'Friend',
            book_title: bookContent.title,
            artist_name: bookContent.artistName,
            download_url: downloadUrl,
            order_id: bookOrder.id.slice(0, 8).toUpperCase(),
            amount_paid: `$${(bookOrder.amount_paid / 100).toFixed(2)}`,
          },
          book_order_id: bookOrder.id,
        }),
      }).catch(err => {
        console.error('[process-ebook-order] Failed to send delivery email:', err);
      });
    }

    console.log('[process-ebook-order] Ebook order processed successfully');

    return new Response(JSON.stringify({
      success: true,
      bookOrderId: bookOrder.id,
      downloadUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[process-ebook-order] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process ebook order',
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
