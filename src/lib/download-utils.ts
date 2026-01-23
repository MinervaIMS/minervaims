// Utility functions for downloading data as CSV or files

/**
 * Convert an array of objects to CSV string
 */
export function objectsToCSV<T extends object>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  // Create header row
  const headers = columns.map(col => `"${col.header}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      // Handle null/undefined
      if (value === null || value === undefined) return '""';
      // Handle arrays
      if (Array.isArray(value)) return `"${value.join('; ')}"`;
      // Handle strings with quotes/commas/newlines
      const stringValue = String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\ufeff' + content], { type: mimeType }); // BOM for Excel compatibility
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download CSV from data
 */
export function downloadCSV<T extends object>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
) {
  const csv = objectsToCSV(data, columns);
  downloadFile(csv, filename);
}

/**
 * Download multiple files as a batch (opens download for each file with a delay)
 */
export async function downloadFilesSequentially(
  files: { url: string; filename: string }[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);
    
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      success++;
      
      // Small delay between downloads to prevent browser blocking
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`Failed to download ${file.filename}:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}

/**
 * Clean filename for download (remove special characters)
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'document';
}
