/**
 * Mock PDF Generator (for testing without Puppeteer)
 * 
 * This generates simple PDFs using jsPDF library instead of Puppeteer.
 * Use this for initial testing, then implement full Puppeteer version later.
 */

import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

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

/**
 * Generate interior PDF using jsPDF (simple version)
 * Returns a basic PDF at the correct dimensions
 */
export async function generateInteriorPdf(content: BookContent): Promise<Uint8Array> {
  console.log('[PDF Generator] Generating interior PDF (mock)...');
  
  // Create PDF at 8.75" x 8.75" (with bleed)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: [8.75, 8.75],
  });

  // Title page
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text(content.title, 4.375, 3, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'italic');
  doc.text(`by ${content.artistName}`, 4.375, 3.5, { align: 'center' });

  // Add story pages
  content.pages.forEach((page, idx) => {
    doc.addPage([8.75, 8.75]);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    
    // Wrap text
    const lines = doc.splitTextToSize(page.text, 7);
    doc.text(lines, 4.375, 4, { align: 'center' });
    
    // Page number
    doc.setFontSize(10);
    doc.text(`Page ${idx + 1}`, 4.375, 8.5, { align: 'center' });
  });

  // "The End" page
  doc.addPage([8.75, 8.75]);
  doc.setFontSize(48);
  doc.setFont('helvetica', 'italic');
  doc.text('The End', 4.375, 4.5, { align: 'center' });

  // About the Artist
  doc.addPage([8.75, 8.75]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('About the Artist', 4.375, 3, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(content.artistName, 4.375, 3.8, { align: 'center' });
  
  if (content.age) {
    doc.setFontSize(14);
    doc.text(`Age ${content.age}`, 4.375, 4.3, { align: 'center' });
  }

  // Convert to Uint8Array
  const pdfBlob = doc.output('arraybuffer');
  
  console.log('[PDF Generator] Interior PDF generated (mock)');
  return new Uint8Array(pdfBlob);
}

/**
 * Generate cover PDF using jsPDF
 */
export async function generateCoverPdf(content: BookContent, pageCount: number): Promise<Uint8Array> {
  console.log('[PDF Generator] Generating cover PDF (mock)...');
  
  // Calculate spine width
  const spineWidth = pageCount * 0.00225;
  const coverWidth = 8.5 + spineWidth + 8.5 + 0.25; // Back + Spine + Front + Bleed
  const coverHeight = 8.75; // 8.5" + 0.25" bleed
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [coverHeight, coverWidth],
  });

  // Background
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 0, coverWidth, coverHeight, 'F');

  // Back cover area
  doc.setFillColor(220, 220, 220);
  doc.rect(0.125, 0.125, 8.5, 8.5, 'F');
  doc.setFontSize(12);
  doc.text('Once Upon a Drawing', 4.5, 4.5, { align: 'center' });

  // Spine
  const spineX = 0.125 + 8.5;
  doc.setFillColor(60, 60, 60);
  doc.rect(spineX, 0, spineWidth, coverHeight, 'F');
  
  // Spine text (rotated)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`${content.title} • ${content.artistName}`, spineX + (spineWidth / 2), 4.375, {
    align: 'center',
    angle: 90,
  });

  // Front cover
  const frontX = spineX + spineWidth;
  doc.setFillColor(255, 255, 255);
  doc.rect(frontX, 0.125, 8.5, 8.5, 'F');
  
  // Title on front
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(content.title, frontX + 4.25, 6, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'italic');
  doc.text(`by ${content.artistName}`, frontX + 4.25, 6.6, { align: 'center' });

  const pdfBlob = doc.output('arraybuffer');
  
  console.log('[PDF Generator] Cover PDF generated (mock)');
  return new Uint8Array(pdfBlob);
}
