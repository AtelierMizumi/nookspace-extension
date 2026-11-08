import { BackupExportResult } from '../types/backupTypes';

export interface DownloadBackupOptions {
  customFilename?: string;
}

/**
 * Triggers a browser download of a BackupExportResult Blob using a temporary anchor element.
 * Safe for Chrome MV3, Firefox MV2, and gracefully handles headless/test environments.
 */
export function downloadBackupFile(
  exportResult: BackupExportResult,
  options: DownloadBackupOptions = {}
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const filename = options.customFilename || exportResult.filename;
  const blob = exportResult.blob;

  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Clean up DOM and object URL
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch {
        // Ignored during cleanup
      }
    }, 100);

    return true;
  } catch (err) {
    console.error('[downloadBackup] Failed to trigger file download:', err);
    return false;
  }
}
