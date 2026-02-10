/**
 * Production PDF Generator using pdf-lib
 * 
 * Creates print-ready PDFs with actual images from Supabase Storage
 * Compatible with Deno/Supabase Edge Functions
 * Supports multiple book types (Softcover and Hardcover)
 */

import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BookType, getBookTypeConfig } from './book-config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export interface StoryPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

export interface BookContent {
  title: string;
  artistName: string;
  age?: string;
  year?: string;
  dedication?: string;
  originalImageUrl: string;
  heroImageUrl: string;
  pages: StoryPage[];
}

// Constants for print specs
const DPI = 300;
const INTERIOR_WIDTH_INCHES = 8.75;
const INTERIOR_HEIGHT_INCHES = 8.75;
const POINTS_PER_INCH = 72;

// Convert inches to PDF points
const INTERIOR_WIDTH = INTERIOR_WIDTH_INCHES * POINTS_PER_INCH;
const INTERIOR_HEIGHT = INTERIOR_HEIGHT_INCHES * POINTS_PER_INCH;

/**
 * Fetch image from URL and return as Uint8Array
 */
async function fetchImageBuffer(url: string): Promise<Uint8Array> {
  console.log('[PDF Generator] Fetching image:', url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('[PDF Generator] Error fetching image:', error);
    throw error;
  }
}

/**
 * Get signed URL for storage path
 */
async function getSignedUrl(bucketName: string, path: string): Promise<string> {
  if (!path) return '';
  
  // If already a full URL, return as-is
  if (path.startsWith('http')) return path;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Create a signed URL valid for 1 hour
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, 3600);
  
  if (error || !data?.signedUrl) {
    console.error('[PDF Generator] Error creating signed URL:', error);
    // Fallback to public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);
    return publicData.publicUrl;
  }
  
  return data.signedUrl;
}

/**
 * Generate interior PDF with actual images
 */
export async function generateInteriorPdf(content: BookContent): Promise<Uint8Array> {
  console.log('[PDF Generator] Generating production interior PDF...');
  console.log('[PDF Generator] Story pages:', content.pages.length);
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // "This Book Belongs To" page
  console.log('[PDF Generator] Creating "This Book Belongs To" page...');
  const belongsToPage = pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);

  const belongsToText = 'This Book Belongs To';
  const belongsToTextWidth = boldFont.widthOfTextAtSize(belongsToText, 32);
  belongsToPage.drawText(belongsToText, {
    x: (INTERIOR_WIDTH - belongsToTextWidth) / 2,
    y: INTERIOR_HEIGHT / 2 + 40,
    size: 32,
    font: boldFont,
    color: rgb(0.25, 0.25, 0.25),
  });

  // Horizontal line for handwriting name
  const lineWidth = INTERIOR_WIDTH * 0.6;
  const lineX = (INTERIOR_WIDTH - lineWidth) / 2;
  const lineY = INTERIOR_HEIGHT / 2 - 30;
  belongsToPage.drawLine({
    start: { x: lineX, y: lineY },
    end: { x: lineX + lineWidth, y: lineY },
    thickness: 1.5,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Title Page
  console.log('[PDF Generator] Creating title page...');
  const titlePage = pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);
  
  // Draw title
  titlePage.drawText(content.title, {
    x: INTERIOR_WIDTH / 2 - (content.title.length * 12),
    y: INTERIOR_HEIGHT / 2 + 50,
    size: 36,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  // Draw author
  const authorText = `by ${content.artistName}`;
  titlePage.drawText(authorText, {
    x: INTERIOR_WIDTH / 2 - (authorText.length * 6),
    y: INTERIOR_HEIGHT / 2,
    size: 24,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  // Dedication page (if exists)
  if (content.dedication) {
    console.log('[PDF Generator] Creating dedication page...');
    const dedicationPage = pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);
    dedicationPage.drawText(content.dedication, {
      x: 50,
      y: INTERIOR_HEIGHT / 2,
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
      maxWidth: INTERIOR_WIDTH - 100,
    });
  }
  
  // Story pages with images
  for (let i = 0; i < content.pages.length; i++) {
    const storyPage = content.pages[i];
    console.log(`[PDF Generator] Creating story page ${i + 1}/${content.pages.length}...`);
    
    try {
      // Fetch and embed image
      const imageUrl = storyPage.imageUrl;
      const imageBuffer = await fetchImageBuffer(imageUrl);
      
      let image;
      if (imageUrl.toLowerCase().includes('.png') || imageUrl.toLowerCase().endsWith('png')) {
        image = await pdfDoc.embedPng(imageBuffer);
      } else {
        image = await pdfDoc.embedJpg(imageBuffer);
      }
      
      // Create page for image
      const imagePage = pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);
      
      // Calculate dimensions to fill page while maintaining aspect ratio
      const imgDims = image.scale(1);
      const pageAspectRatio = INTERIOR_WIDTH / INTERIOR_HEIGHT;
      const imgAspectRatio = imgDims.width / imgDims.height;
      
      let drawWidth, drawHeight, x, y;
      
      if (imgAspectRatio > pageAspectRatio) {
        // Image is wider - fit to height
        drawHeight = INTERIOR_HEIGHT;
        drawWidth = drawHeight * imgAspectRatio;
        x = (INTERIOR_WIDTH - drawWidth) / 2;
        y = 0;
      } else {
        // Image is taller - fit to width
        drawWidth = INTERIOR_WIDTH;
        drawHeight = drawWidth / imgAspectRatio;
        x = 0;
        y = (INTERIOR_HEIGHT - drawHeight) / 2;
      }
      
      imagePage.drawImage(image, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
      
      // Add text below image if there's room
      if (storyPage.text && y > 80) {
        imagePage.drawText(storyPage.text, {
          x: 50,
          y: 50,
          size: 14,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: INTERIOR_WIDTH - 100,
        });
      }
    } catch (error) {
      console.error(`[PDF Generator] Error processing page ${i + 1}:`, error);
      // Create a page with text only if image fails
      const fallbackPage = pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);
      fallbackPage.drawText(storyPage.text || 'Image unavailable', {
        x: 50,
        y: INTERIOR_HEIGHT / 2,
        size: 16,
        font: font,
        color: rgb(0, 0, 0),
        maxWidth: INTERIOR_WIDTH - 100,
      });
    }
  }
  
  // "The End" page
  console.log('[PDF Generator] Creating "The End" page...');
  const endPage = pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);
  const endText = 'The End';
  endPage.drawText(endText, {
    x: INTERIOR_WIDTH / 2 - 80,
    y: INTERIOR_HEIGHT / 2,
    size: 48,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  // About the Artist page
  console.log('[PDF Generator] Creating "About the Artist" page...');
  const aboutPage = pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);
  aboutPage.drawText('About the Artist', {
    x: INTERIOR_WIDTH / 2 - 100,
    y: INTERIOR_HEIGHT / 2 + 100,
    size: 28,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  aboutPage.drawText(content.artistName, {
    x: INTERIOR_WIDTH / 2 - (content.artistName.length * 8),
    y: INTERIOR_HEIGHT / 2 + 40,
    size: 22,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  if (content.age) {
    aboutPage.drawText(`Age ${content.age}`, {
      x: INTERIOR_WIDTH / 2 - 40,
      y: INTERIOR_HEIGHT / 2,
      size: 18,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  
  // "Draw Here" page
  console.log('[PDF Generator] Creating "Draw Here" page...');
  const drawPage = pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);

  const drawTitle = 'Your Turn to Draw!';
  const drawTitleWidth = boldFont.widthOfTextAtSize(drawTitle, 32);
  drawPage.drawText(drawTitle, {
    x: (INTERIOR_WIDTH - drawTitleWidth) / 2,
    y: INTERIOR_HEIGHT - 80,
    size: 32,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Empty canvas frame
  const frameMargin = 60;
  const frameTop = INTERIOR_HEIGHT - 130;
  const frameBottom = 80;
  const frameLeft = frameMargin;
  const frameRight = INTERIOR_WIDTH - frameMargin;
  const frameWidth = frameRight - frameLeft;
  const frameHeight = frameTop - frameBottom;

  drawPage.drawRectangle({
    x: frameLeft,
    y: frameBottom,
    width: frameWidth,
    height: frameHeight,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1.5,
    color: rgb(1, 1, 1),
  });

  // Small inspirational text below frame
  const inspirationText = 'Every artist starts with a blank page';
  const inspirationWidth = font.widthOfTextAtSize(inspirationText, 12);
  drawPage.drawText(inspirationText, {
    x: (INTERIOR_WIDTH - inspirationWidth) / 2,
    y: frameBottom - 30,
    size: 12,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Ensure even page count (Lulu requirement)
  const currentPageCount = pdfDoc.getPageCount();
  if (currentPageCount % 2 !== 0) {
    console.log('[PDF Generator] Adding blank page to make even page count...');
    pdfDoc.addPage([INTERIOR_WIDTH, INTERIOR_HEIGHT]);
  }
  
  console.log('[PDF Generator] Final page count:', pdfDoc.getPageCount());
  
  const pdfBytes = await pdfDoc.save();
  console.log('[PDF Generator] Production interior PDF generated:', pdfBytes.length, 'bytes');
  
  return pdfBytes;
}

/**
 * Generate cover PDF with front and back covers
 */
export async function generateCoverPdf(
  content: BookContent, 
  pageCount: number,
  bookType: BookType = BookType.SOFTCOVER
): Promise<Uint8Array> {
  console.log('[PDF Generator] Generating production cover PDF...');
  console.log('[PDF Generator] Book type:', bookType);
  
  // Get book configuration
  const bookConfig = getBookTypeConfig(bookType);
  
  // Calculate dimensions
  const spineWidthInches = pageCount * bookConfig.pageThickness;
  const coverWidthInches = 8.5 + spineWidthInches + 8.5 + 0.25; // Back + Spine + Front + Bleed
  const coverHeightInches = 8.75; // 8.5" + 0.25" bleed
  
  const coverWidth = coverWidthInches * POINTS_PER_INCH;
  const coverHeight = coverHeightInches * POINTS_PER_INCH;
  const spineWidth = spineWidthInches * POINTS_PER_INCH;
  
  console.log('[PDF Generator] Cover dimensions:', {
    width: coverWidthInches,
    height: coverHeightInches,
    spine: spineWidthInches,
  });
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const coverPage = pdfDoc.addPage([coverWidth, coverHeight]);
  
  // Back cover (left side)
  const backCoverX = 0.125 * POINTS_PER_INCH; // 0.125" bleed
  const backCoverWidth = 8.5 * POINTS_PER_INCH;
  const backCoverHeight = 8.5 * POINTS_PER_INCH;
  
  // Draw back cover background - soft pastel blue (#E0F2FE)
  coverPage.drawRectangle({
    x: backCoverX,
    y: 0.125 * POINTS_PER_INCH,
    width: backCoverWidth,
    height: backCoverHeight,
    color: rgb(0.878, 0.949, 0.996), // #E0F2FE
  });
  
  // Back cover text (center)
  coverPage.drawText('Once Upon a Drawing', {
    x: backCoverX + backCoverWidth / 2 - 100,
    y: coverHeight / 2,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  coverPage.drawText('A unique storybook created', {
    x: backCoverX + backCoverWidth / 2 - 90,
    y: coverHeight / 2 - 30,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  coverPage.drawText('from an original drawing.', {
    x: backCoverX + backCoverWidth / 2 - 85,
    y: coverHeight / 2 - 50,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  // "Made with Love" text at bottom center
  const madeWithLoveText = 'Made with Love in Once Upon a Drawing';
  const madeWithLoveWidth = madeWithLoveText.length * 4; // Approximate width
  coverPage.drawText(madeWithLoveText, {
    x: backCoverX + backCoverWidth / 2 - madeWithLoveWidth,
    y: 0.125 * POINTS_PER_INCH + 40, // 40 points from bottom edge
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  // Spine (middle)
  const spineX = backCoverX + backCoverWidth;
  
  coverPage.drawRectangle({
    x: spineX,
    y: 0,
    width: spineWidth,
    height: coverHeight,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  // Spine text (rotated) - keep it minimal due to small width
  if (spineWidth > 20) {
    const spineText = `${content.title} • ${content.artistName}`;
    coverPage.drawText(spineText, {
      x: spineX + spineWidth / 2 + 6,
      y: coverHeight / 2 - (spineText.length * 3),
      size: 8,
      font: font,
      color: rgb(1, 1, 1),
      rotate: { type: 'degrees', angle: 90 },
    });
  }
  
  // Front cover (right side)
  const frontCoverX = spineX + spineWidth;
  const frontCoverWidth = 8.5 * POINTS_PER_INCH;
  
  try {
    // Try to use hero image for front cover
    if (content.heroImageUrl) {
      console.log('[PDF Generator] Adding hero image to front cover...');
      const imageBuffer = await fetchImageBuffer(content.heroImageUrl);
      
      let image;
      if (content.heroImageUrl.toLowerCase().includes('.png')) {
        image = await pdfDoc.embedPng(imageBuffer);
      } else {
        image = await pdfDoc.embedJpg(imageBuffer);
      }
      
      // Draw image to cover front cover area
      const imgDims = image.scale(1);
      const coverAspectRatio = frontCoverWidth / (8.5 * POINTS_PER_INCH);
      const imgAspectRatio = imgDims.width / imgDims.height;
      
      let drawWidth, drawHeight, x, y;
      
      if (imgAspectRatio > coverAspectRatio) {
        drawHeight = 8.5 * POINTS_PER_INCH;
        drawWidth = drawHeight * imgAspectRatio;
        x = frontCoverX + (frontCoverWidth - drawWidth) / 2;
        y = 0.125 * POINTS_PER_INCH;
      } else {
        drawWidth = frontCoverWidth;
        drawHeight = drawWidth / imgAspectRatio;
        x = frontCoverX;
        y = 0.125 * POINTS_PER_INCH + (8.5 * POINTS_PER_INCH - drawHeight) / 2;
      }
      
      coverPage.drawImage(image, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      // Fallback: white background
      coverPage.drawRectangle({
        x: frontCoverX,
        y: 0.125 * POINTS_PER_INCH,
        width: frontCoverWidth,
        height: 8.5 * POINTS_PER_INCH,
        color: rgb(1, 1, 1),
      });
    }
  } catch (error) {
    console.error('[PDF Generator] Error adding hero image:', error);
    // Fallback: white background
    coverPage.drawRectangle({
      x: frontCoverX,
      y: 0.125 * POINTS_PER_INCH,
      width: frontCoverWidth,
      height: 8.5 * POINTS_PER_INCH,
      color: rgb(1, 1, 1),
    });
  }
  
  // Title overlay on front cover (bottom third, with semi-transparent background)
  const titleBoxHeight = 150;
  const titleBoxY = 0.125 * POINTS_PER_INCH + 50;
  
  coverPage.drawRectangle({
    x: frontCoverX,
    y: titleBoxY,
    width: frontCoverWidth,
    height: titleBoxHeight,
    color: rgb(1, 1, 1),
    opacity: 0.9,
  });
  
  // Draw title on front
  const titleSize = Math.min(32, 600 / content.title.length);
  coverPage.drawText(content.title, {
    x: frontCoverX + frontCoverWidth / 2 - (content.title.length * titleSize / 4),
    y: titleBoxY + titleBoxHeight - 50,
    size: titleSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  // Draw artist name on front
  const byLine = `by ${content.artistName}`;
  coverPage.drawText(byLine, {
    x: frontCoverX + frontCoverWidth / 2 - (byLine.length * 6),
    y: titleBoxY + titleBoxHeight - 85,
    size: 16,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  const pdfBytes = await pdfDoc.save();
  console.log('[PDF Generator] Production cover PDF generated:', pdfBytes.length, 'bytes');
  
  return pdfBytes;
}
