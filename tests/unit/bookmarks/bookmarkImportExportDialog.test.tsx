import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BookmarkImportExportDialog } from '../../../src/features/bookmarks/components/BookmarkImportExportDialog';
import { useBookmarkStore } from '../../../src/features/bookmarks/stores/bookmarkStore';
import * as exportUtils from '../../../src/features/bookmarks/utils/bookmarkExportUtils';
import * as coordinator from '../../../src/features/bookmarks/services/bookmarkImportCoordinator';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';

describe('BookmarkImportExportDialog — Milestone 6.7 UI Component', () => {
  const sampleGroups: BookmarkGroupEntity[] = [
    {
      id: 'grp-dev',
      workspaceId: 'ws-1',
      title: 'Development',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  const sampleBookmarks: BookmarkEntity[] = [
    {
      id: 'bm-1',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitHub',
      url: 'https://github.com',
      isFavorite: true,
      order: 0,
      createdAt: 100,
      updatedAt: 100,
    },
  ];

  let mockLoadBookmarks: ReturnType<typeof vi.fn>;
  let mockLoadGroups: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLoadBookmarks = vi.fn().mockResolvedValue(undefined);
    mockLoadGroups = vi.fn().mockResolvedValue(undefined);

    useBookmarkStore.setState({
      bookmarks: [...sampleBookmarks],
      groups: [...sampleGroups],
      loadBookmarks: mockLoadBookmarks,
      loadGroups: mockLoadGroups,
    });
  });

  it('1. does not render anything when isOpen is false', () => {
    const { container } = render(
      <BookmarkImportExportDialog isOpen={false} onClose={() => {}} workspaceId="ws-1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('2. renders Export tab by default with HTML and JSON export options', () => {
    render(
      <BookmarkImportExportDialog isOpen={true} onClose={() => {}} workspaceId="ws-1" />
    );

    expect(screen.getByText('Import & Export Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Netscape Bookmark HTML')).toBeInTheDocument();
    expect(screen.getByText('NookSpace JSON Backup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export HTML' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export JSON' })).toBeInTheDocument();
  });

  it('3. triggers HTML file download when clicking Export HTML', () => {
    const downloadSpy = vi.spyOn(exportUtils, 'triggerFileDownload').mockImplementation(() => {});

    render(
      <BookmarkImportExportDialog isOpen={true} onClose={() => {}} workspaceId="ws-1" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export HTML' }));

    expect(downloadSpy).toHaveBeenCalledWith(
      expect.stringContaining('<!DOCTYPE NETSCAPE-Bookmark-file-1>'),
      expect.stringMatching(/^nookspace-bookmarks-.*\.html$/),
      'text/html'
    );
  });

  it('4. triggers JSON file download when clicking Export JSON', () => {
    const downloadSpy = vi.spyOn(exportUtils, 'triggerFileDownload').mockImplementation(() => {});

    render(
      <BookmarkImportExportDialog isOpen={true} onClose={() => {}} workspaceId="ws-1" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));

    expect(downloadSpy).toHaveBeenCalledWith(
      expect.stringContaining('"format": "nookspace-bookmarks"'),
      expect.stringMatching(/^nookspace-backup-.*\.json$/),
      'application/json'
    );
  });

  it('5. switches to Import tab and displays file selection dropzone', () => {
    render(
      <BookmarkImportExportDialog isOpen={true} onClose={() => {}} workspaceId="ws-1" />
    );

    fireEvent.click(screen.getByText('Import Bookmarks'));

    expect(screen.getByText(/click to browse or drag file here/i)).toBeInTheDocument();
    expect(screen.getByText(/supports netscape bookmark html/i)).toBeInTheDocument();
  });

  it('6. parses uploaded file and displays preflight preview statistics', async () => {
    const parseSpy = vi.spyOn(coordinator, 'parseImportFile').mockReturnValue({
      format: 'html',
      sourceFilename: 'my-bookmarks.html',
      totalFolders: 2,
      totalBookmarks: 5,
      validBookmarks: 4,
      invalidBookmarks: 1,
      rejectedUnsafeUrls: 1,
      duplicateBookmarksInFile: 0,
      candidateGroups: [
        { tempId: 'g1', title: 'Work', order: 0 },
        { tempId: 'g2', title: 'Reading', order: 1 },
      ],
      candidateBookmarks: [
        { tempId: 'b1', tempGroupId: 'g1', title: 'Slack', url: 'https://slack.com', isFavorite: false, order: 0, isValid: true },
      ],
      invalidEntries: [{ title: 'Bad', url: 'javascript:1', reason: 'Unsafe' }],
    });

    render(
      <BookmarkImportExportDialog isOpen={true} onClose={() => {}} workspaceId="ws-1" />
    );

    fireEvent.click(screen.getByText('Import Bookmarks'));

    const file = new File(['<html content>'], 'my-bookmarks.html', { type: 'text/html' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('my-bookmarks.html')).toBeInTheDocument();
      expect(screen.getByText(/^html$/i)).toBeInTheDocument();
      expect(screen.getAllByText('2')).toHaveLength(2); // 2 folders & 2 rejected
      expect(screen.getByText('4')).toBeInTheDocument(); // 4 valid links
    });

    parseSpy.mockRestore();
  });

  it('7. enables Destructive Replace mode requiring explicit confirmation checkbox', async () => {
    vi.spyOn(coordinator, 'parseImportFile').mockReturnValue({
      format: 'json',
      sourceFilename: 'backup.json',
      totalFolders: 1,
      totalBookmarks: 1,
      validBookmarks: 1,
      invalidBookmarks: 0,
      rejectedUnsafeUrls: 0,
      duplicateBookmarksInFile: 0,
      candidateGroups: [],
      candidateBookmarks: [
        { tempId: 'b1', tempGroupId: null, title: 'Item', url: 'https://item.com', isFavorite: false, order: 0, isValid: true },
      ],
      invalidEntries: [],
    });

    render(
      <BookmarkImportExportDialog isOpen={true} onClose={() => {}} workspaceId="ws-1" />
    );

    fireEvent.click(screen.getByText('Import Bookmarks'));
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('backup.json')).toBeInTheDocument();
    });

    // Select Replace Workspace
    fireEvent.click(screen.getByLabelText(/replace workspace/i));

    expect(screen.getByText('Destructive Action Warning')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: 'Replace & Import' });
    expect(submitBtn).toBeDisabled();

    // Check confirmation checkbox
    const confirmCheckbox = screen.getByLabelText(
      /i understand this will overwrite all bookmarks in this workspace/i
    );
    fireEvent.click(confirmCheckbox);

    expect(submitBtn).not.toBeDisabled();
  });

  it('8. executes import transaction and renders success completion view', async () => {
    vi.spyOn(coordinator, 'parseImportFile').mockReturnValue({
      format: 'html',
      sourceFilename: 'bookmarks.html',
      totalFolders: 1,
      totalBookmarks: 1,
      validBookmarks: 1,
      invalidBookmarks: 0,
      rejectedUnsafeUrls: 0,
      duplicateBookmarksInFile: 0,
      candidateGroups: [],
      candidateBookmarks: [
        { tempId: 'b1', tempGroupId: null, title: 'Item', url: 'https://item.com', isFavorite: false, order: 0, isValid: true },
      ],
      invalidEntries: [],
    });

    const executeSpy = vi.spyOn(coordinator, 'executeImportTransaction').mockResolvedValue({
      success: true,
      mode: 'merge',
      groupsCreated: 1,
      bookmarksCreated: 3,
      bookmarksUpdated: 1,
      bookmarksSkipped: 0,
    });

    render(
      <BookmarkImportExportDialog isOpen={true} onClose={() => {}} workspaceId="ws-1" />
    );

    fireEvent.click(screen.getByText('Import Bookmarks'));
    const file = new File(['content'], 'bookmarks.html', { type: 'text/html' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('bookmarks.html')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(screen.getByText('Import Completed Successfully')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // bookmarksCreated
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });

    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(mockLoadBookmarks).toHaveBeenCalledWith('ws-1');
    expect(mockLoadGroups).toHaveBeenCalledWith('ws-1');
  });
});
