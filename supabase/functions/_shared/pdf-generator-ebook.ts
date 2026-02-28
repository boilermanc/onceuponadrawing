/**
 * Ebook PDF Generator
 *
 * Generates a single PDF for digital delivery:
 *   - Front cover (single page)
 *   - Interior pages (reuses production generator)
 *   - Back cover (single page)
 *
 * Same 300 DPI print quality so customers can print if desired.
 * No bleed margins (not needed for screen/home printing).
 */

import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';
import { BookContent, generateInteriorPdf } from './pdf-generator-production.ts';

// 8.5" x 8.5" at 72 points per inch (standard PDF points)
const PAGE_SIZE = 8.5 * 72; // 612 points

/**
 * Fetch image from URL and return as Uint8Array
 */
async function fetchImageBuffer(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Generate a front cover page as a standalone single-page PDF document.
 */
async function generateFrontCoverPage(content: BookContent, coverColorId?: string, textColorId?: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([PAGE_SIZE, PAGE_SIZE]);

  // Cover background colors by ID (must match BookProof.tsx COVER_COLORS)
  const coverColors: Record<string, { r: number; g: number; b: number }> = {
    'soft-blue': { r: 0.878, g: 0.949, b: 0.996 },   // #E0F2FE
    'cream': { r: 0.996, g: 0.976, b: 0.906 },       // #FEF9E7
    'sage': { r: 0.835, g: 0.910, b: 0.831 },        // #D5E8D4
    'blush': { r: 0.988, g: 0.894, b: 0.925 },       // #FCE4EC
    'lavender': { r: 0.910, g: 0.871, b: 0.973 },    // #E8DEF8
    'buttercup': { r: 1, g: 0.976, b: 0.769 },       // #FFF9C4
    'black': { r: 0.102, g: 0.102, b: 0.102 },       // #1A1A1A
    'navy': { r: 0.106, g: 0.165, b: 0.290 },        // #1B2A4A
  };

  const textColors: Record<string, { r: number; g: number; b: number }> = {
    'gunmetal': { r: 0.176, g: 0.204, b: 0.235 },
    'navy': { r: 0.118, g: 0.141, b: 0.196 },
    'forest': { r: 0.086, g: 0.282, b: 0.204 },
    'burgundy': { r: 0.502, g: 0.098, b: 0.173 },
    'white': { r: 1, g: 1, b: 1 },
    'gold': { r: 0.710, g: 0.569, b: 0.184 },
  };

  const bgColor = coverColors[coverColorId || 'soft-blue'] || coverColors['soft-blue'];
  const txtColor = textColors[textColorId || 'gunmetal'] || textColors['gunmetal'];

  // Fill background
  page.drawRectangle({
    x: 0, y: 0,
    width: PAGE_SIZE, height: PAGE_SIZE,
    color: rgb(bgColor.r, bgColor.g, bgColor.b),
  });

  // Try to draw hero image
  try {
    if (content.heroImageUrl) {
      console.log('[Ebook PDF] Adding hero image to front cover...');
      const imageBuffer = await fetchImageBuffer(content.heroImageUrl);
      const image = content.heroImageUrl.toLowerCase().includes('.png')
        ? await pdfDoc.embedPng(imageBuffer)
        : await pdfDoc.embedJpg(imageBuffer);

      const imgDims = image.scale(1);
      const imgAspectRatio = imgDims.width / imgDims.height;

      // Draw image in top 65% of page
      const imageAreaHeight = PAGE_SIZE * 0.65;
      const imageAreaY = PAGE_SIZE * 0.35;
      let drawWidth, drawHeight, x, y;

      if (imgAspectRatio > 1) {
        drawWidth = PAGE_SIZE * 0.85;
        drawHeight = drawWidth / imgAspectRatio;
        x = (PAGE_SIZE - drawWidth) / 2;
        y = imageAreaY + (imageAreaHeight - drawHeight) / 2;
      } else {
        drawHeight = imageAreaHeight * 0.9;
        drawWidth = drawHeight * imgAspectRatio;
        x = (PAGE_SIZE - drawWidth) / 2;
        y = imageAreaY + (imageAreaHeight - drawHeight) / 2;
      }

      page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
    }
  } catch (err) {
    console.error('[Ebook PDF] Error adding hero image to cover:', err);
  }

  // Title text overlay in lower portion
  const titleBoxY = 30;
  const titleBoxHeight = PAGE_SIZE * 0.30;

  // Semi-transparent overlay for readability
  page.drawRectangle({
    x: 0, y: titleBoxY,
    width: PAGE_SIZE, height: titleBoxHeight,
    color: rgb(bgColor.r, bgColor.g, bgColor.b),
    opacity: 0.85,
  });

  // Title
  const titleSize = Math.min(32, 500 / content.title.length);
  const titleWidth = content.title.length * titleSize * 0.5;
  page.drawText(content.title, {
    x: Math.max(40, (PAGE_SIZE - titleWidth) / 2),
    y: titleBoxY + titleBoxHeight - 60,
    size: titleSize,
    font: boldFont,
    color: rgb(txtColor.r, txtColor.g, txtColor.b),
    maxWidth: PAGE_SIZE - 80,
  });

  // Author
  const byLine = `by ${content.artistName}`;
  const byLineWidth = byLine.length * 8;
  page.drawText(byLine, {
    x: Math.max(40, (PAGE_SIZE - byLineWidth) / 2),
    y: titleBoxY + titleBoxHeight - 100,
    size: 16,
    font: font,
    color: rgb(txtColor.r, txtColor.g, txtColor.b),
  });

  return pdfDoc.save();
}

/**
 * Generate a back cover page as a standalone single-page PDF document.
 */
async function generateBackCoverPage(content: BookContent, coverColorId?: string, textColorId?: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([PAGE_SIZE, PAGE_SIZE]);

  // Cover background colors by ID (must match BookProof.tsx COVER_COLORS)
  const coverColors: Record<string, { r: number; g: number; b: number }> = {
    'soft-blue': { r: 0.878, g: 0.949, b: 0.996 },   // #E0F2FE
    'cream': { r: 0.996, g: 0.976, b: 0.906 },       // #FEF9E7
    'sage': { r: 0.835, g: 0.910, b: 0.831 },        // #D5E8D4
    'blush': { r: 0.988, g: 0.894, b: 0.925 },       // #FCE4EC
    'lavender': { r: 0.910, g: 0.871, b: 0.973 },    // #E8DEF8
    'buttercup': { r: 1, g: 0.976, b: 0.769 },       // #FFF9C4
    'black': { r: 0.102, g: 0.102, b: 0.102 },       // #1A1A1A
    'navy': { r: 0.106, g: 0.165, b: 0.290 },        // #1B2A4A
  };

  const textColors: Record<string, { r: number; g: number; b: number }> = {
    'gunmetal': { r: 0.176, g: 0.204, b: 0.235 },
    'navy': { r: 0.118, g: 0.141, b: 0.196 },
    'forest': { r: 0.086, g: 0.282, b: 0.204 },
    'burgundy': { r: 0.502, g: 0.098, b: 0.173 },
    'white': { r: 1, g: 1, b: 1 },
    'gold': { r: 0.710, g: 0.569, b: 0.184 },
  };

  const bgColor = coverColors[coverColorId || 'soft-blue'] || coverColors['soft-blue'];
  const txtColor = textColors[textColorId || 'gunmetal'] || textColors['gunmetal'];

  // Fill background
  page.drawRectangle({
    x: 0, y: 0,
    width: PAGE_SIZE, height: PAGE_SIZE,
    color: rgb(bgColor.r, bgColor.g, bgColor.b),
  });

  // Try to embed original drawing
  try {
    if (content.originalImageUrl) {
      console.log('[Ebook PDF] Adding original drawing to back cover...');
      const imageBuffer = await fetchImageBuffer(content.originalImageUrl);
      const image = content.originalImageUrl.toLowerCase().includes('.png')
        ? await pdfDoc.embedPng(imageBuffer)
        : await pdfDoc.embedJpg(imageBuffer);

      const imgDims = image.scale(1);
      const imgAspectRatio = imgDims.width / imgDims.height;

      // Center the original drawing in upper portion
      const maxSize = PAGE_SIZE * 0.45;
      let drawWidth, drawHeight;
      if (imgAspectRatio > 1) {
        drawWidth = maxSize;
        drawHeight = drawWidth / imgAspectRatio;
      } else {
        drawHeight = maxSize;
        drawWidth = drawHeight * imgAspectRatio;
      }

      page.drawImage(image, {
        x: (PAGE_SIZE - drawWidth) / 2,
        y: PAGE_SIZE * 0.45,
        width: drawWidth,
        height: drawHeight,
      });
    }
  } catch (err) {
    console.error('[Ebook PDF] Error adding original drawing to back cover:', err);
  }

  // "Once Upon a Drawing" branding
  const brandText = 'Once Upon a Drawing';
  const brandWidth = brandText.length * 9;
  page.drawText(brandText, {
    x: Math.max(40, (PAGE_SIZE - brandWidth) / 2),
    y: PAGE_SIZE * 0.32,
    size: 18,
    font: boldFont,
    color: rgb(txtColor.r, txtColor.g, txtColor.b),
  });

  // Tagline
  const tagline = 'A unique storybook created from an original drawing.';
  const taglineWidth = tagline.length * 5;
  page.drawText(tagline, {
    x: Math.max(40, (PAGE_SIZE - taglineWidth) / 2),
    y: PAGE_SIZE * 0.26,
    size: 11,
    font: font,
    color: rgb(txtColor.r, txtColor.g, txtColor.b),
    maxWidth: PAGE_SIZE - 80,
  });

  // Bottom branding
  const madeText = 'onceuponadrawing.com';
  const madeWidth = madeText.length * 4.5;
  page.drawText(madeText, {
    x: Math.max(40, (PAGE_SIZE - madeWidth) / 2),
    y: 40,
    size: 10,
    font: font,
    color: rgb(txtColor.r, txtColor.g, txtColor.b),
  });

  return pdfDoc.save();
}

/**
 * Generate a complete ebook PDF: front cover + interior + back cover
 * merged into a single file.
 */
export async function generateEbookPdf(
  content: BookContent,
  options?: { coverColorId?: string; textColorId?: string }
): Promise<Uint8Array> {
  console.log('[Ebook PDF] Starting ebook generation for:', content.title);

  // Generate parts sequentially to avoid CPU spikes (edge function CPU limits)
  console.log('[Ebook PDF] Generating front cover...');
  const frontCoverBytes = await generateFrontCoverPage(content, options?.coverColorId, options?.textColorId);

  console.log('[Ebook PDF] Generating interior pages...');
  const interiorBytes = await generateInteriorPdf(content);

  console.log('[Ebook PDF] Generating back cover...');
  const backCoverBytes = await generateBackCoverPage(content, options?.coverColorId, options?.textColorId);

  console.log('[Ebook PDF] All parts generated, merging...');

  // Merge into a single PDF
  const mergedPdf = await PDFDocument.create();

  const frontDoc = await PDFDocument.load(frontCoverBytes);
  const interiorDoc = await PDFDocument.load(interiorBytes);
  const backDoc = await PDFDocument.load(backCoverBytes);

  // Copy front cover
  const [frontPage] = await mergedPdf.copyPages(frontDoc, [0]);
  mergedPdf.addPage(frontPage);

  // Copy all interior pages
  const interiorPageCount = interiorDoc.getPageCount();
  const interiorIndices = Array.from({ length: interiorPageCount }, (_, i) => i);
  const interiorPages = await mergedPdf.copyPages(interiorDoc, interiorIndices);
  for (const page of interiorPages) {
    mergedPdf.addPage(page);
  }

  // Copy back cover
  const [backPage] = await mergedPdf.copyPages(backDoc, [0]);
  mergedPdf.addPage(backPage);

  // Set PDF metadata
  mergedPdf.setTitle(content.title);
  mergedPdf.setAuthor(content.artistName);
  mergedPdf.setCreator('Once Upon a Drawing');
  mergedPdf.setProducer('Once Upon a Drawing');

  const pdfBytes = await mergedPdf.save();
  console.log('[Ebook PDF] Complete ebook PDF generated:', pdfBytes.length, 'bytes,', mergedPdf.getPageCount(), 'pages');

  return pdfBytes;
}
