/**
 * Helper function to create a minimal valid PDF blob
 */
export function createPDFBlob(content: string, title: string): Blob {
  // Create a minimal PDF structure
  const pdfContent = `%PDF-1.4
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
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length ${content.length + 100}
>>
stream
BT
/F1 12 Tf
100 700 Td
(${title}) Tj
0 -20 Td
(${content.replace(/\n/g, '\\n').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000315 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${500 + content.length}
%%EOF`;

  return new Blob([pdfContent], { type: 'application/pdf' });
}

/**
 * Create an HTML document that looks like a PDF for viewing
 */
export function createPDFViewHTML(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      background: #f5f5f5;
    }
    .document {
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      min-height: 800px;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #4F46E5;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .content {
      line-height: 1.6;
      color: #555;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="document">
    <h1>${title}</h1>
    <div class="content">${content}</div>
    <div class="footer">
      <p>Document generated on ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>`;
}
