import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MigrationDiagnosticsModal } from '../../../src/features/migrations/components/MigrationDiagnosticsModal';
import { legacyDataScanner } from '../../../src/features/migrations/services/legacyDataScanner';
import { migrationEngine } from '../../../src/features/migrations/services/migrationEngine';
import { legacyDataRepairService } from '../../../src/features/migrations/services/legacyDataRepairService';

describe('MigrationDiagnosticsModal UI Suite — Milestone 9.5', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. renders modal header, schema version, and controls when open', async () => {
    vi.spyOn(legacyDataScanner, 'scan').mockResolvedValue({
      scannedAt: Date.now(),
      summary: {
        totalRecordsScanned: 50,
        compatibleCount: 45,
        migratableCount: 3,
        recoverableCount: 2,
        unsupportedCount: 0,
        corruptedCount: 0,
        criticalCount: 0,
        warningCount: 2,
        infoCount: 3,
      },
      issues: [
        {
          id: 'issue-1',
          category: 'orphan_note_collection',
          severity: 'warning',
          classification: 'Recoverable',
          table: 'notes',
          entityId: 'note-1',
          description: 'Note references deleted collection',
          suggestedAction: 'Reset collectionId to null',
          repairable: true,
        },
      ],
    });

    render(<MigrationDiagnosticsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Database & Migration Diagnostics')).toBeInTheDocument();
    expect(screen.getByText(/Dexie Schema v4/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Scanned')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('Note references deleted collection')).toBeInTheDocument();
    });
  });

  it('2. allows switching between Issues tab and History tab', async () => {
    vi.spyOn(legacyDataScanner, 'scan').mockResolvedValue({
      scannedAt: Date.now(),
      summary: {
        totalRecordsScanned: 10,
        compatibleCount: 10,
        migratableCount: 0,
        recoverableCount: 0,
        unsupportedCount: 0,
        corruptedCount: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      issues: [],
    });

    vi.spyOn(migrationEngine.getJournalService(), 'getJournalRecords').mockResolvedValue([
      {
        migrationId: 'v1-v2-widget-layouts',
        name: 'Layouts Breakpoint Upgrade',
        type: 'schema',
        status: 'completed',
        startedAt: Date.now() - 5000,
        completedAt: Date.now() - 4000,
        durationMs: 1000,
        recordsProcessed: 5,
        recordsModified: 5,
      },
    ]);

    render(<MigrationDiagnosticsModal isOpen={true} onClose={vi.fn()} />);

    // Click History tab
    const historyTab = screen.getByRole('button', { name: /journal tab/i });
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('Layouts Breakpoint Upgrade')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  it('3. triggers single issue repair when Repair button is clicked', async () => {
    vi.spyOn(legacyDataScanner, 'scan').mockResolvedValue({
      scannedAt: Date.now(),
      summary: {
        totalRecordsScanned: 10,
        compatibleCount: 9,
        migratableCount: 0,
        recoverableCount: 1,
        unsupportedCount: 0,
        corruptedCount: 0,
        criticalCount: 0,
        warningCount: 1,
        infoCount: 0,
      },
      issues: [
        {
          id: 'issue-rep-1',
          category: 'orphan_bookmark_group',
          severity: 'warning',
          classification: 'Recoverable',
          table: 'bookmarks',
          entityId: 'bm-rep-1',
          description: 'Bookmark in non-existent group',
          suggestedAction: 'Reset groupId to null',
          repairable: true,
        },
      ],
    });

    const repairSpy = vi.spyOn(legacyDataRepairService, 'repairIssues').mockResolvedValue({
      issuesProcessed: 1,
      repairedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      details: [
        {
          issueId: 'issue-rep-1',
          entityId: 'bm-rep-1',
          table: 'bookmarks',
          status: 'repaired',
          message: 'Reset groupId to null',
        },
      ],
    });

    render(<MigrationDiagnosticsModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Bookmark in non-existent group')).toBeInTheDocument();
    });

    const repairBtn = screen.getByRole('button', { name: /^repair$/i });
    fireEvent.click(repairBtn);

    await waitFor(() => {
      expect(repairSpy).toHaveBeenCalledTimes(1);
    });
  });
});
