/**
 * Utility function to export data to CSV file
 * @param data - Array of arrays representing rows and columns
 * @param filename - Name of the file to download (without extension)
 */
export function exportToCSV(data: (string | number)[][], filename: string): void {
  try {
    // Convert data to CSV format
    const csv = data.map(row => 
      row.map(cell => {
        // Handle cells that contain commas, quotes, or newlines
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
}

/**
 * Utility function to export data to CSV with BOM for Excel compatibility
 * @param data - Array of arrays representing rows and columns
 * @param filename - Name of the file to download (without extension)
 */
export function exportToCSVForExcel(data: (string | number)[][], filename: string): void {
  try {
    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csv = BOM + data.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
}

