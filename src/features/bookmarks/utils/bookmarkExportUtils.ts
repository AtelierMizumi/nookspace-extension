/**
 * Triggers a client-side file download using a Blob and temporary anchor element.
 * Safely revokes the object URL after download initiation.
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });

  if (typeof window.URL !== 'undefined' && typeof window.URL.createObjectURL === 'function') {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}

/**
 * Formats a Date into standard YYYY-MM-DD string for export filenames.
 */
export function getExportDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
