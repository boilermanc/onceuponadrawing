/**
 * Ultra-Simple PDF Generator (for testing)
 * 
 * Generates minimal valid PDF files without any external dependencies.
 */

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
 * Generate a minimal valid PDF (just a blank page with text)
 * This is for testing the upload/download flow without dependencies
 */
export async function generateInteriorPdf(content: BookContent): Promise<Uint8Array> {
  console.log('[PDF Generator] Generating simple interior PDF...');
  
  // Minimal valid PDF structure
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 630 630]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 80
>>
stream
BT
/F1 24 Tf
100 500 Td
(${content.title}) Tj
0 -30 Td
(by ${content.artistName}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000324 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
453
%%EOF`;

  const encoder = new TextEncoder();
  console.log('[PDF Generator] Simple interior PDF generated');
  return encoder.encode(pdf);
}

/**
 * Generate a minimal cover PDF
 */
export async function generateCoverPdf(content: BookContent, pageCount: number): Promise<Uint8Array> {
  console.log('[PDF Generator] Generating simple cover PDF...');
  
  const spineWidth = pageCount * 0.00225;
  
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
>>
>>
/MediaBox [0 0 1240 630]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 95
>>
stream
BT
/F1 32 Tf
600 400 Td
(${content.title}) Tj
0 -40 Td
(by ${content.artistName}) Tj
0 -30 Td
(Spine: ${spineWidth.toFixed(4)}") Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000333 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
477
%%EOF`;

  const encoder = new TextEncoder();
  console.log('[PDF Generator] Simple cover PDF generated');
  return encoder.encode(pdf);
}
