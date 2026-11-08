import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  BookmarkFormModal,
  FolderFormModal,
  DeleteFolderModal,
  MoveBookmarkModal,
} from '../../../src/features/bookmarks/components/BookmarkDialogs';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';

describe('BookmarkDialogs — Milestone 6.5 UI Modals', () => {
  const sampleGroups: BookmarkGroupEntity[] = [
    {
      id: 'grp-dev',
      workspaceId: 'ws-1',
      title: 'Development',
      color: '#3B82F6',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'grp-read',
      workspaceId: 'ws-1',
      title: 'Reading List',
      color: '#10B981',
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  const sampleBookmark: BookmarkEntity = {
    id: 'bm-1',
    workspaceId: 'ws-1',
    groupId: 'grp-dev',
    title: 'GitHub',
    url: 'https://github.com',
    description: 'Developer code platform',
    isFavorite: true,
    order: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };

  describe('BookmarkFormModal', () => {
    it('renders create mode with empty fields and default folder', () => {
      render(
        <BookmarkFormModal
          isOpen={true}
          onClose={() => {}}
          groups={sampleGroups}
          defaultGroupId="grp-dev"
          onSubmit={async () => {}}
        />
      );

      expect(screen.getByText('Add New Bookmark')).toBeInTheDocument();
      const titleInput = screen.getByPlaceholderText('e.g. GitHub') as HTMLInputElement;
      expect(titleInput.value).toBe('');
      const urlInput = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
      expect(urlInput.value).toBe('');
      const folderSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(folderSelect.value).toBe('grp-dev');
    });

    it('renders edit mode with initial bookmark details populated', () => {
      render(
        <BookmarkFormModal
          isOpen={true}
          onClose={() => {}}
          initialBookmark={sampleBookmark}
          groups={sampleGroups}
          onSubmit={async () => {}}
        />
      );

      expect(screen.getByText('Edit Bookmark')).toBeInTheDocument();
      expect((screen.getByPlaceholderText('e.g. GitHub') as HTMLInputElement).value).toBe('GitHub');
      expect((screen.getByPlaceholderText('https://example.com') as HTMLInputElement).value).toBe(
        'https://github.com'
      );
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('grp-dev');
    });

    it('shows validation error when submitting empty title', async () => {
      const handleSubmit = vi.fn();
      render(
        <BookmarkFormModal
          isOpen={true}
          onClose={() => {}}
          groups={sampleGroups}
          onSubmit={handleSubmit}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('https://example.com'), {
        target: { value: 'https://valid.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /add bookmark/i }));

      expect(await screen.findByText('Title cannot be empty')).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error when submitting invalid or unsafe URL', async () => {
      const handleSubmit = vi.fn();
      render(
        <BookmarkFormModal
          isOpen={true}
          onClose={() => {}}
          groups={sampleGroups}
          onSubmit={handleSubmit}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('e.g. GitHub'), {
        target: { value: 'Malicious' },
      });
      fireEvent.change(screen.getByPlaceholderText('https://example.com'), {
        target: { value: 'javascript:alert(1)' },
      });
      fireEvent.click(screen.getByRole('button', { name: /add bookmark/i }));

      expect(
        await screen.findByText(/Only https:, http:, and mailto: are permitted/i)
      ).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('submits valid bookmark inputs and calls onSubmit', async () => {
      const handleSubmit = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();
      render(
        <BookmarkFormModal
          isOpen={true}
          onClose={handleClose}
          groups={sampleGroups}
          onSubmit={handleSubmit}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('e.g. GitHub'), {
        target: { value: 'New Site' },
      });
      fireEvent.change(screen.getByPlaceholderText('https://example.com'), {
        target: { value: 'https://newsite.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Add notes or tags about this link...'), {
        target: { value: 'Great site' },
      });
      fireEvent.click(screen.getByRole('button', { name: /add bookmark/i }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          title: 'New Site',
          url: 'https://newsite.com',
          description: 'Great site',
          groupId: null,
          isFavorite: false,
        });
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });

  describe('FolderFormModal', () => {
    it('renders create mode and validates empty title', async () => {
      const handleSubmit = vi.fn();
      render(
        <FolderFormModal
          isOpen={true}
          onClose={() => {}}
          onSubmit={handleSubmit}
        />
      );

      expect(screen.getByText('Create New Folder')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

      expect(await screen.findByText('Folder name cannot be empty')).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('renders rename mode and submits new folder title with color', async () => {
      const handleSubmit = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();
      render(
        <FolderFormModal
          isOpen={true}
          onClose={handleClose}
          initialFolder={sampleGroups[0]}
          onSubmit={handleSubmit}
        />
      );

      expect(screen.getByText('Rename Folder')).toBeInTheDocument();
      const input = screen.getByPlaceholderText('e.g. Design Inspiration');
      fireEvent.change(input, { target: { value: 'Advanced Tools' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith('Advanced Tools', '#3B82F6');
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });

  describe('DeleteFolderModal', () => {
    it('renders folder title and affected bookmark count with Mode A selected by default', () => {
      render(
        <DeleteFolderModal
          isOpen={true}
          onClose={() => {}}
          folder={sampleGroups[0]}
          affectedCount={5}
          onConfirm={async () => {}}
        />
      );

      expect(screen.getByText(/Delete Folder "Development"/)).toBeInTheDocument();
      expect(screen.getByText(/Keep bookmarks in Uncategorized/)).toBeInTheDocument();
      expect(screen.getByText(/safely moved to Uncategorized with no data loss/)).toBeInTheDocument();
    });

    it('allows toggling to Mode B (cascade) and triggers confirmation with chosen mode', async () => {
      const handleConfirm = vi.fn().mockResolvedValue(undefined);
      render(
        <DeleteFolderModal
          isOpen={true}
          onClose={() => {}}
          folder={sampleGroups[0]}
          affectedCount={3}
          onConfirm={handleConfirm}
        />
      );

      // Select cascade radio
      const cascadeRadio = screen.getByRole('radio', { name: /Permanently delete folder/i });
      fireEvent.click(cascadeRadio);

      // Click confirm button
      fireEvent.click(screen.getByRole('button', { name: /delete folder & bookmarks/i }));

      await waitFor(() => {
        expect(handleConfirm).toHaveBeenCalledWith('cascade');
      });
    });
  });

  describe('MoveBookmarkModal', () => {
    it('displays list of folders and submits selected destination on move', async () => {
      const handleMove = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <MoveBookmarkModal
          isOpen={true}
          onClose={handleClose}
          bookmark={sampleBookmark}
          groups={sampleGroups}
          onMove={handleMove}
        />
      );

      expect(screen.getByText(/Select destination folder for "GitHub"/)).toBeInTheDocument();

      // Click Uncategorized
      fireEvent.click(screen.getByRole('button', { name: /uncategorized/i }));
      fireEvent.click(screen.getByRole('button', { name: /move bookmark/i }));

      await waitFor(() => {
        expect(handleMove).toHaveBeenCalledWith('bm-1', null);
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
});
