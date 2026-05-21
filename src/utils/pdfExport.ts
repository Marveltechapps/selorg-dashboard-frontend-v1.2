/**
 * Utility functions to export data to PDF
 */

declare global {
  interface Window {
    jspdf?: {
      jsPDF: new (...args: unknown[]) => JsPdfDocument;
    };
  }
}

interface JsPdfDocument {
  setFont(font: string, style?: string): void;
  setFontSize(size: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  text(text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  addPage(): void;
  save(filename: string): void;
}

export interface ReportPdfField {
  label: string;
  value: string;
}

export interface ReportPdfSection {
  title: string;
  content: string[];
}

let jsPdfLoadPromise: Promise<new (...args: unknown[]) => JsPdfDocument> | null = null;

function loadJsPdfConstructor(): Promise<new (...args: unknown[]) => JsPdfDocument> {
  if (jsPdfLoadPromise) return jsPdfLoadPromise;

  jsPdfLoadPromise = new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF) {
      resolve(window.jspdf.jsPDF);
      return;
    }

    const existing = document.querySelector('script[data-jspdf-loader="true"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF failed to load'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load jsPDF')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.dataset.jspdfLoader = 'true';
    script.onload = () => {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('jsPDF failed to load'));
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(script);
  });

  return jsPdfLoadPromise;
}

export async function downloadReportPdf(options: {
  filename: string;
  title: string;
  subtitle?: string;
  fields: ReportPdfField[];
  sections?: ReportPdfSection[];
}): Promise<void> {
  const JsPDF = await loadJsPdfConstructor();
  const doc = new JsPDF();
  let yPos = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(8, 145, 178);
  doc.text(options.title, 105, yPos, { align: 'center' });
  yPos += 10;

  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(options.subtitle, 105, yPos, { align: 'center' });
    yPos += 12;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  doc.setFontSize(11);
  options.fields.forEach((field, index) => {
    const col = index % 2;
    const xPos = col === 0 ? 20 : 110;
    if (col === 0 && index > 0) yPos += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(field.label, xPos, yPos);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(field.value || '—', xPos, yPos + 6);
  });

  yPos += 24;

  for (const section of options.sections ?? []) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(section.title, 20, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    for (const line of section.content) {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 20, yPos);
      yPos += 6;
    }
    yPos += 6;
  }

  const safeName = options.filename.replace(/[^\w.-]+/g, '_');
  doc.save(`${safeName}.pdf`);
}

/**
 * Utility function to export data to PDF
 * Note: This is a basic implementation. For production, consider using jsPDF or server-side generation
 * @param content - HTML content or text to convert to PDF
 * @param filename - Name of the file to download (without extension)
 */
export function exportToPDF(content: string, filename: string): void {
  try {
    // Create a new window with the content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #212121;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
      // Note: User will need to save as PDF from print dialog
      // For automatic download, consider using jsPDF library
    }, 250);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
}

/**
 * Export table data as PDF using print dialog
 * @param tableElement - HTML table element or table HTML string
 * @param filename - Name of the file
 */
export function exportTableToPDF(tableElement: string | HTMLElement, filename: string): void {
  try {
    const tableHTML = typeof tableElement === 'string' 
      ? tableElement 
      : tableElement.outerHTML;

    exportToPDF(`<h1>${filename}</h1>${tableHTML}`, filename);
  } catch (error) {
    console.error('Error exporting table to PDF:', error);
    throw error;
  }
}
