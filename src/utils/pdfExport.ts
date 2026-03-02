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
