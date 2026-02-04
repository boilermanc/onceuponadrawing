/**
 * Generate Book Preview
 * 
 * Admin function to generate print-ready PDFs for testing and preview
 * WITHOUT submitting to Lulu. This allows admins to inspect PDFs before orders.
 * 
 * Usage:
 *   POST /functions/v1/generate-book-preview
 *   Body: { "creationId": "uuid" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Use production PDF generator with actual images
import { generateInteriorPdf, generateCoverPdf, BookContent } from '../_shared/pdf-generator-production.ts';
import { getInteriorPdfSpecs, getCoverPdfSpecs } from '../_shared/pdf-specs.ts';
import { FIXED_PAGE_COUNT, BookType, getBookTypeConfig } from '../_shared/book-config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
};

// Decode JWT to check if user is admin
function isAdmin(authHeader: string | null): boolean {
  if (!authHeader) {
    console.log('[isAdmin] No auth header provided');
    return false;
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[isAdmin] Invalid token format - expected 3 parts, got:', parts.length);
      return false;
    }

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const decoded = JSON.parse(jsonStr);

    console.log('[isAdmin] Decoded token email:', decoded.email);
    
    // Check if user email matches admin email
    const isAdminUser = decoded.email === 'team@sproutify.app';
    console.log('[isAdmin] Is admin?', isAdminUser);
    return isAdminUser;
  } catch (e) {
    console.error('[isAdmin] Error decoding token:', e);
    return false;
  }
}

interface GeneratePreviewRequest {
  creationId: string;
  bookType?: BookType; // Optional, defaults to SOFTCOVER
}

Deno.serve(async (req) => {
  console.log('[generate-book-preview] Request received:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    console.log('[generate-book-preview] Auth header present?', !!authHeader);
    console.log('[generate-book-preview] Auth header starts with Bearer?', authHeader?.startsWith('Bearer '));
    
    if (!isAdmin(authHeader)) {
      console.error('[generate-book-preview] Unauthorized: Not an admin');
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[generate-book-preview] Admin check passed');

    const body: GeneratePreviewRequest = await req.json();
    const bookType = body.bookType || BookType.SOFTCOVER; // Default to softcover
    
    console.log('[generate-book-preview] Generating preview for creation:', body.creationId);
    console.log('[generate-book-preview] Book type:', bookType);

    if (!body.creationId) {
      return new Response(JSON.stringify({ error: 'Missing creationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const bookConfig = getBookTypeConfig(bookType);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Fetch creation details
    console.log('[generate-book-preview] Fetching creation from database...');
    const { data: creation, error: creationError } = await supabase
      .from('creations')
      .select('*')
      .eq('id', body.creationId)
      .single();

    if (creationError || !creation) {
      throw new Error(`Failed to fetch creation: ${creationError?.message}`);
    }

    console.log('[generate-book-preview] Creation found:', creation.title);

    // Step 2: Convert storage paths to signed URLs
    async function getSignedUrl(bucketName: string, path: string): Promise<string> {
      if (!path) return '';

      // If already a full URL, return as-is
      if (path.startsWith('http')) return path;

      // Get signed URL from storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, 60 * 60); // 1 hour expiry

      if (error || !data?.signedUrl) {
        console.error(`[generate-book-preview] Failed to get signed URL for ${bucketName}/${path}:`, error);
        return '';
      }
      return data.signedUrl;
    }

    // Get URLs for images (stored in 'drawings' bucket)
    const originalImageUrl = creation.original_image_path
      ? await getSignedUrl('drawings', creation.original_image_path)
      : '';
    
    const heroImageUrl = originalImageUrl; // Use same image for hero
    
    // Handle story pages from analysis_json with signed URLs from page_images
    const rawPages = creation.analysis_json?.pages || [];
    const pageImagePaths: string[] = creation.page_images || [];

    // Generate signed URLs for each page image
    console.log('[generate-book-preview] Generating signed URLs for', pageImagePaths.length, 'page images...');
    const storyPages = await Promise.all(
      rawPages.map(async (page: { pageNumber: number; text: string; imageUrl: string }, index: number) => {
        const pagePath = pageImagePaths[index];
        let imageUrl = page.imageUrl; // fallback to original URL

        if (pagePath) {
          const signedUrl = await getSignedUrl('page-images', pagePath);
          if (signedUrl) {
            imageUrl = signedUrl;
            console.log(`[generate-book-preview] Page ${index + 1}: signed URL obtained`);
          } else {
            console.warn(`[generate-book-preview] Page ${index + 1}: failed to get signed URL, using fallback`);
          }
        } else {
          console.warn(`[generate-book-preview] Page ${index + 1}: no page_images path, using original imageUrl`);
        }

        return {
          pageNumber: page.pageNumber,
          text: page.text,
          imageUrl,
        };
      })
    );
    console.log('[generate-book-preview] Story pages prepared:', storyPages.length);

    const bookContent: BookContent = {
      title: creation.title || 'Untitled Story',
      artistName: creation.artist_name || 'Unknown Artist',
      age: creation.age || creation.artist_age,
      year: creation.year,
      dedication: creation.dedication_text,
      originalImageUrl,
      heroImageUrl,
      pages: storyPages,
    };

    console.log('[generate-book-preview] Book content prepared');
    console.log('[generate-book-preview] - Title:', bookContent.title);
    console.log('[generate-book-preview] - Artist:', bookContent.artistName);
    console.log('[generate-book-preview] - Pages:', bookContent.pages.length);

    // Step 3: Generate PDFs
    console.log('[generate-book-preview] Generating interior PDF...');
    const interiorPdf = await generateInteriorPdf(bookContent);
    console.log('[generate-book-preview] Interior PDF generated:', interiorPdf.length, 'bytes');

    console.log('[generate-book-preview] Generating cover PDF...');
    const coverPdf = await generateCoverPdf(bookContent, FIXED_PAGE_COUNT, bookType);
    console.log('[generate-book-preview] Cover PDF generated:', coverPdf.length, 'bytes');

    // Step 4: Upload PDFs to storage (previews folder)
    const timestamp = Date.now();
    const sanitizedTitle = creation.title?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'untitled';
    const interiorPath = `previews/${body.creationId}/${sanitizedTitle}-interior-${timestamp}.pdf`;
    const coverPath = `previews/${body.creationId}/${sanitizedTitle}-cover-${timestamp}.pdf`;

    console.log('[generate-book-preview] Uploading interior PDF...');
    console.log('[generate-book-preview] Interior path:', interiorPath);
    console.log('[generate-book-preview] Interior size:', interiorPdf.length, 'bytes');
    
    const { error: interiorUploadError } = await supabase.storage
      .from('book-pdfs')
      .upload(interiorPath, interiorPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (interiorUploadError) {
      console.error('[generate-book-preview] Interior upload error:', interiorUploadError);
      throw new Error(`Failed to upload interior PDF: ${interiorUploadError.message}`);
    }

    console.log('[generate-book-preview] Uploading cover PDF...');
    const { error: coverUploadError } = await supabase.storage
      .from('book-pdfs')
      .upload(coverPath, coverPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (coverUploadError) {
      throw new Error(`Failed to upload cover PDF: ${coverUploadError.message}`);
    }

    console.log('[generate-book-preview] PDFs uploaded successfully');

    // Step 5: Generate signed URLs (7 days expiry for preview)
    const expirySeconds = 7 * 24 * 60 * 60; // 7 days

    console.log('[generate-book-preview] Generating signed URLs...');
    const { data: interiorSignedUrl } = await supabase.storage
      .from('book-pdfs')
      .createSignedUrl(interiorPath, expirySeconds);

    const { data: coverSignedUrl } = await supabase.storage
      .from('book-pdfs')
      .createSignedUrl(coverPath, expirySeconds);

    if (!interiorSignedUrl?.signedUrl || !coverSignedUrl?.signedUrl) {
      throw new Error('Failed to generate signed URLs');
    }

    console.log('[generate-book-preview] Signed URLs generated');

    // Step 6: Get specs for summary
    const interiorSpecs = getInteriorPdfSpecs();
    const coverSpecs = getCoverPdfSpecs(FIXED_PAGE_COUNT, bookType);

    // Calculate file sizes in MB
    const interiorSizeMB = (interiorPdf.length / 1024 / 1024).toFixed(2);
    const coverSizeMB = (coverPdf.length / 1024 / 1024).toFixed(2);

    return new Response(JSON.stringify({
      success: true,
      message: 'Preview PDFs generated successfully',
      creation: {
        id: creation.id,
        title: creation.title,
        artistName: creation.artist_name,
      },
      pdfs: {
        interior: {
          url: interiorSignedUrl.signedUrl,
          path: interiorPath,
          sizeMB: parseFloat(interiorSizeMB),
          sizeBytes: interiorPdf.length,
        },
        cover: {
          url: coverSignedUrl.signedUrl,
          path: coverPath,
          sizeMB: parseFloat(coverSizeMB),
          sizeBytes: coverPdf.length,
        },
      },
      specs: {
        product: bookConfig.productCode,
        bookType: bookConfig.displayName,
        format: '8.5" × 8.5" Square',
        binding: bookConfig.bindingType,
        paper: '60# Uncoated White',
        pageCount: FIXED_PAGE_COUNT,
        interior: {
          dimensions: `${interiorSpecs.widthInches}" × ${interiorSpecs.heightInches}"`,
          resolution: `${interiorSpecs.widthPixels}px × ${interiorSpecs.heightPixels}px`,
          dpi: interiorSpecs.dpi,
          bleed: '0.125" on all sides',
        },
        cover: {
          dimensions: `${coverSpecs.widthInches.toFixed(3)}" × ${coverSpecs.heightInches}"`,
          resolution: `${coverSpecs.widthPixels}px × ${coverSpecs.heightPixels}px`,
          dpi: coverSpecs.dpi,
          spineWidth: `${coverSpecs.spineWidthInches.toFixed(4)}"`,
          layout: `Back (8.5") + Spine (${coverSpecs.spineWidthInches.toFixed(3)}") + Front (8.5") + Bleed (0.25")`,
        },
      },
      expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
      note: 'These are preview PDFs only. No order has been submitted to Lulu.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-book-preview] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to generate preview PDFs',
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
