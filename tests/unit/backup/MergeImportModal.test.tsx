import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MergeImportModal } from '../../../src/features/backup/components/MergeImportModal';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';

// Mock useWorkspaceStore
vi.mock('../../../src/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

describe('Milestone 9.4 — MergeImportModal Component Suite', () => {
  beforeEach(() => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [
        {
          id: 'ws-test-1',
          name: 'Main Workspace',
          icon: 'Home',
          color: '#6366f1',
          order: 0,
          isDefault: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activeWorkspaceId: 'ws-test-1',
    } as any);
  });

  it('renders upload screen when opened', () => {
    render(<MergeImportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Merge Import Backup')).toBeInTheDocument();
    expect(screen.getByText('Select a Universal JSON Backup file')).toBeInTheDocument();
    expect(screen.getByText('Browse File')).toBeInTheDocument();
  });

  it('does not render modal contents when isOpen is false', () => {
    render(<MergeImportModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Merge Import Backup')).not.toBeInTheDocument();
  });

  it('handles file input change and transitions to scope selection', async () => {
    const mockBackup = JSON.stringify({
      format: 'nookspace-backup',
      formatVersion: 1,
      appVersion: '0.1.0-alpha.44',
      schemaVersion: 4,
      metadata: {
        exportedAt: new Date().toISOString(),
        itemCounts: {},
        isPartialBackup: false,
        integrity: { algorithm: 'SHA-256', checksum: 'dummy' },
      },
      data: {
        workspaces: [],
        settings: null,
        widgetInstances: [],
        widgetLayouts: [],
        todos: [],
        notes: [],
        noteCollections: [],
        noteTags: [],
        noteBookmarkLinks: [],
        bookmarks: [],
        bookmarkGroups: [],
        focusSessions: [],
        dailyGoals: [],
        stickyNotes: [],
        vocabulary: [],
        resources: [],
        calendarEvents: [],
      },
    });

    const file = new File([mockBackup], 'backup.json', { type: 'application/json' });
    // Polyfill text() method for happy-dom if needed
    if (!file.text) {
      file.text = () => Promise.resolve(mockBackup);
    }

    render(<MergeImportModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/upload backup file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Select Data to Import:')).toBeInTheDocument();
      expect(screen.getByText('Analyze Preview')).toBeInTheDocument();
    });
  });
});
