import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RestoreModal } from '../../../src/features/backup/components/RestoreModal';
import { restorePreflightService } from '../../../src/features/backup/services/restorePreflightService';
import { restoreEngineService } from '../../../src/features/backup/services/restoreEngineService';

describe('RestoreModal Component', () => {
  it('renders modal with upload prompt when open', () => {
    render(<RestoreModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Restore Backup')).toBeInTheDocument();
    expect(screen.getByText('Select Backup File')).toBeInTheDocument();
    expect(screen.getByText(/Choose a valid NookSpace JSON backup/i)).toBeInTheDocument();
  });

  it('does not render modal content when isOpen is false', () => {
    render(<RestoreModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Restore Backup')).not.toBeInTheDocument();
  });

  it('displays error badge when preflight rejects a partial backup', async () => {
    vi.spyOn(restorePreflightService, 'prepareRestore').mockResolvedValueOnce({
      success: false,
      operationId: 'op-test-partial',
      validationReport: null as any,
      canonicalBackup: null,
      currentStats: null as any,
      backupStats: null as any,
      warnings: [],
      error: {
        code: 'PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED',
        message: 'Partial backup restore is not supported in NookSpace.',
        operationId: 'op-test-partial',
        isRecoverable: false,
      },
    });

    render(<RestoreModal isOpen={true} onClose={() => {}} />);

    const fakeFile = new File(['{"format":"nookspace-bookmarks"}'], 'bookmarks.json', {
      type: 'application/json',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.getByText('Backup Not Restorable')).toBeInTheDocument();
      expect(screen.getByText('PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED')).toBeInTheDocument();
      expect(
        screen.getByText('Partial backup restore is not supported in NookSpace.')
      ).toBeInTheDocument();
    });
  });

  it('displays verified metadata and requires confirmation checkbox before enabling restore button', async () => {
    vi.spyOn(restorePreflightService, 'prepareRestore').mockResolvedValueOnce({
      success: true,
      operationId: 'op-test-valid',
      validationReport: {} as any,
      canonicalBackup: {
        format: 'nookspace-backup',
        formatVersion: 1,
        metadata: {
          exportedAt: 1700000000000,
          appVersion: '0.1.0',
          databaseSchemaVersion: 4,
          exportType: 'full',
          itemCounts: {},
          integrity: { algorithm: 'SHA-256', checksum: 'abc' },
        },
        data: {} as any,
      },
      currentStats: {
        workspaceCount: 1,
        totalRecords: 10,
        tableCounts: {},
        estimatedSnapshotSizeBytes: 5000,
      },
      backupStats: {
        workspaceCount: 2,
        totalRecords: 45,
        tableCounts: {},
      },
      warnings: [],
    });

    render(<RestoreModal isOpen={true} onClose={() => {}} />);

    const fakeFile = new File(['{"format":"nookspace-backup"}'], 'nookspace-backup.json', {
      type: 'application/json',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.getByText('Verified V1 Backup')).toBeInTheDocument();
      expect(screen.getByText('Destructive Operation: Current Data Replacement')).toBeInTheDocument();
    });

    // The restore button must be disabled until user checks confirmation
    const restoreBtn = screen.getByRole('button', {
      name: /restore and replace current data/i,
    });
    expect(restoreBtn).toBeDisabled();

    // Check confirmation
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(restoreBtn).not.toBeDisabled();
  });

  it('triggers restoreEngineService on confirmation and displays success state', async () => {
    vi.spyOn(restorePreflightService, 'prepareRestore').mockResolvedValueOnce({
      success: true,
      operationId: 'op-exec',
      validationReport: {} as any,
      canonicalBackup: {
        format: 'nookspace-backup',
        formatVersion: 1,
        metadata: {
          exportedAt: 1700000000000,
          appVersion: '0.1.0',
          databaseSchemaVersion: 4,
          exportType: 'full',
          itemCounts: {},
          integrity: { algorithm: 'SHA-256', checksum: 'abc' },
        },
        data: {} as any,
      },
      currentStats: {
        workspaceCount: 1,
        totalRecords: 10,
        tableCounts: {},
        estimatedSnapshotSizeBytes: 5000,
      },
      backupStats: {
        workspaceCount: 2,
        totalRecords: 45,
        tableCounts: {},
      },
      warnings: [],
    });

    const restoreSpy = vi.spyOn(restoreEngineService, 'restoreBackup').mockResolvedValueOnce({
      success: true,
      operationId: 'op-exec',
      finalState: 'completed',
      restoredCounts: { workspaces: 2 },
      durationMs: 120,
    });

    const onRestoreSuccess = vi.fn();

    render(
      <RestoreModal
        isOpen={true}
        onClose={() => {}}
        onRestoreSuccess={onRestoreSuccess}
      />
    );

    const fakeFile = new File(['{"format":"nookspace-backup"}'], 'backup.json', {
      type: 'application/json',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox'));

    const restoreBtn = screen.getByRole('button', {
      name: /restore and replace current data/i,
    });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(restoreSpy).toHaveBeenCalled();
      expect(onRestoreSuccess).toHaveBeenCalled();
      expect(screen.getByText('Restore Completed Successfully')).toBeInTheDocument();
    });
  });
});
