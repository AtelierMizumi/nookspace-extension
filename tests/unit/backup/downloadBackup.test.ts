import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBackupFile } from '../../../src/features/backup/utils/downloadBackup';
import { BackupExportResult, NookSpaceUniversalBackupV1 } from '../../../src/features/backup/types/backupTypes';

describe('Milestone 9.1 — Backup Download Utility', () => {
  let mockCreateObjectURL: any;
  let mockRevokeObjectURL: any;
  let appendedElements: HTMLElement[] = [];
  let clickedLinks: HTMLAnchorElement[] = [];

  beforeEach(() => {
    appendedElements = [];
    clickedLinks = [];

    mockCreateObjectURL = vi.fn().mockReturnValue('blob:chrome-extension://mock-url');
    mockRevokeObjectURL = vi.fn();

    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    // Spy on document.body.appendChild
    vi.spyOn(document.body, 'appendChild').mockImplementation((el: any) => {
      appendedElements.push(el);
      return el;
    });

    // Spy on anchor click
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedLinks.push(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockExportResult(): BackupExportResult {
    const mockBackup = {} as NookSpaceUniversalBackupV1;
    const blob = new Blob(['{}'], { type: 'application/json' });
    return {
      backup: mockBackup,
      filename: 'nookspace-backup-2026-11-07-230000.json',
      jsonString: '{}',
      blob,
      sizeBytes: 2,
      itemCounts: {},
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      warnings: [],
    };
  }

  it('creates an anchor, sets download filename, appends to body, triggers click, and revokes object URL', async () => {
    const result = createMockExportResult();
    const success = downloadBackupFile(result);

    expect(success).toBe(true);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(result.blob);
    expect(clickedLinks.length).toBe(1);
    expect(clickedLinks[0].download).toBe('nookspace-backup-2026-11-07-230000.json');
    expect(clickedLinks[0].href).toBe('blob:chrome-extension://mock-url');

    // Wait for the setTimeout cleanup (100ms)
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:chrome-extension://mock-url');
  });

  it('supports custom filename override', async () => {
    const result = createMockExportResult();
    downloadBackupFile(result, { customFilename: 'my-custom-backup.json' });

    expect(clickedLinks[0].download).toBe('my-custom-backup.json');
  });

  it('gracefully returns false if window or document is undefined', () => {
    const originalDoc = globalThis.document;
    try {
      // @ts-ignore
      delete globalThis.document;
      const result = createMockExportResult();
      expect(downloadBackupFile(result)).toBe(false);
    } finally {
      globalThis.document = originalDoc;
    }
  });
});
