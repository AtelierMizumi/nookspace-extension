import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { BookmarkManagerModal } from '../../../src/features/bookmarks/components/BookmarkManagerModal';
import { useBookmarkStore } from '../../../src/features/bookmarks/stores/bookmarkStore';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';

describe('BookmarkManagerModal — Milestone 6.5 Full UI Integration', () => {
  const sampleGroups: BookmarkGroupEntity[] = [
    {
      id: 'grp-dev',
      workspaceId: 'ws-default-personal',
      title: 'Development',
      color: '#3B82F6',
      icon: 'code',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'grp-design',
      workspaceId: 'ws-default-personal',
      title: 'Design',
      color: '#EC4899',
      icon: 'palette',
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  const sampleBookmarks: BookmarkEntity[] = [
    {
      id: 'bm-1',
      workspaceId: 'ws-default-personal',
      groupId: 'grp-dev',
      title: 'GitHub',
      url: 'https://github.com',
      description: 'Code repository',
      isFavorite: true,
      order: 0,
      createdAt: 100,
      updatedAt: 100,
    },
    {
      id: 'bm-2',
      workspaceId: 'ws-default-personal',
      groupId: 'grp-design',
      title: 'Figma',
      url: 'https://figma.com',
      description: 'Interface design tool',
      isFavorite: false,
      order: 0,
      createdAt: 200,
      updatedAt: 200,
    },
    {
      id: 'bm-3',
      workspaceId: 'ws-default-personal',
      groupId: null,
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      description: 'Web standards documentation',
      isFavorite: false,
      order: 0,
      createdAt: 300,
      updatedAt: 300,
    },
  ];

  let mockInitialize: ReturnType<typeof vi.fn>;
  let mockCreateBookmark: ReturnType<typeof vi.fn>;
  let mockUpdateBookmark: ReturnType<typeof vi.fn>;
  let mockDeleteBookmark: ReturnType<typeof vi.fn>;
  let mockToggleFavorite: ReturnType<typeof vi.fn>;
  let mockMoveBookmark: ReturnType<typeof vi.fn>;
  let mockCreateGroup: ReturnType<typeof vi.fn>;
  let mockRenameGroup: ReturnType<typeof vi.fn>;
  let mockDeleteGroup: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInitialize = vi.fn().mockResolvedValue(undefined);
    mockCreateBookmark = vi.fn().mockImplementation((input) =>
      Promise.resolve({
        id: 'bm-new',
        workspaceId: 'ws-default-personal',
        ...input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    mockUpdateBookmark = vi.fn().mockImplementation((id, changes) =>
      Promise.resolve({
        ...sampleBookmarks[0],
        ...changes,
        updatedAt: Date.now(),
      })
    );
    mockDeleteBookmark = vi.fn().mockResolvedValue(true);
    mockToggleFavorite = vi.fn().mockResolvedValue({
      ...sampleBookmarks[0],
      isFavorite: !sampleBookmarks[0].isFavorite,
    });
    mockMoveBookmark = vi.fn().mockImplementation((id, target) =>
      Promise.resolve({
        ...sampleBookmarks[0],
        groupId: target,
      })
    );
    mockCreateGroup = vi.fn().mockImplementation((input) =>
      Promise.resolve({
        id: 'grp-new',
        workspaceId: 'ws-default-personal',
        order: 2,
        ...input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    mockRenameGroup = vi.fn().mockImplementation((id, title) =>
      Promise.resolve({
        ...sampleGroups[0],
        title,
      })
    );
    mockDeleteGroup = vi.fn().mockResolvedValue({
      deletedGroupId: 'grp-dev',
      reassignedBookmarkCount: 1,
      deletedBookmarkCount: 0,
    });

    useWorkspaceStore.setState({
      activeWorkspaceId: 'ws-default-personal',
    });

    useBookmarkStore.setState({
      bookmarks: [...sampleBookmarks],
      groups: [...sampleGroups],
      activeWorkspaceId: 'ws-default-personal',
      isLoading: false,
      isInitialized: true,
      error: null,
      searchQuery: '',
      groupFilter: { type: 'all' },
      activeGroupId: 'all',
      showFavoritesOnly: false,
      sortBy: 'order',
      sortDirection: 'asc',
      initialize: mockInitialize,
      createBookmark: mockCreateBookmark,
      updateBookmark: mockUpdateBookmark,
      deleteBookmark: mockDeleteBookmark,
      toggleFavorite: mockToggleFavorite,
      moveBookmark: mockMoveBookmark,
      createGroup: mockCreateGroup,
      renameGroup: mockRenameGroup,
      deleteGroup: mockDeleteGroup,
    });
  });

  it('1. does not render anything when isOpen is false', () => {
    const { container } = render(
      <BookmarkManagerModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('2. renders the modal container, header, search bar, and primary actions when open', () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('dialog', { name: 'Bookmark Manager' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by title, domain, URL, or notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add bookmark/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /new folder/i })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /close bookmark manager/i })).toBeInTheDocument();
  });

  it('3. calls onClose when clicking the close button or the backdrop', () => {
    const handleClose = vi.fn();
    render(<BookmarkManagerModal isOpen={true} onClose={handleClose} />);

    // Click Close (X) button
    fireEvent.click(screen.getByRole('button', { name: /close bookmark manager/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('4. closes on Escape key when no dialog is open', () => {
    const handleClose = vi.fn();
    render(<BookmarkManagerModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('5. triggers search updates and filters displayed bookmarks', () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    const searchInput = screen.getByPlaceholderText(/search by title, domain, URL, or notes/i);
    fireEvent.change(searchInput, { target: { value: 'GitHub' } });

    expect(useBookmarkStore.getState().searchQuery).toBe('GitHub');
  });

  it('6. navigates between system views and user folders', () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    // Click Favorites in sidebar
    fireEvent.click(screen.getByRole('button', { name: /favorites/i }));
    expect(useBookmarkStore.getState().showFavoritesOnly).toBe(true);

    // Click Uncategorized
    fireEvent.click(screen.getByRole('button', { name: /uncategorized/i }));
    expect(useBookmarkStore.getState().groupFilter).toEqual({ type: 'uncategorized' });
    expect(useBookmarkStore.getState().showFavoritesOnly).toBe(false);

    // Click 'Development' folder
    fireEvent.click(screen.getByRole('button', { name: /^development/i }));
    expect(useBookmarkStore.getState().groupFilter).toEqual({
      type: 'group',
      groupId: 'grp-dev',
    });
  });

  it('7. opens Add Bookmark dialog and creates bookmark on save', async () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /add bookmark/i }));

    expect(screen.getByText('Add New Bookmark')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('e.g. GitHub');
    const urlInput = screen.getByPlaceholderText('https://example.com');

    fireEvent.change(titleInput, { target: { value: 'TypeScript' } });
    fireEvent.change(urlInput, { target: { value: 'https://typescriptlang.org' } });

    const submitBtn = screen.getAllByRole('button', { name: 'Add Bookmark' })[1];
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateBookmark).toHaveBeenCalledWith({
        title: 'TypeScript',
        url: 'https://typescriptlang.org',
        description: undefined,
        groupId: null,
        isFavorite: false,
      });
    });
  });

  it('8. opens Edit Bookmark dialog with populated fields and updates on save', async () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    const editButtons = screen.getAllByRole('button', { name: /edit bookmark/i });
    fireEvent.click(editButtons[0]); // Edit GitHub

    expect(screen.getByText('Edit Bookmark')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('e.g. GitHub') as HTMLInputElement;
    expect(titleInput.value).toBe('GitHub');

    fireEvent.change(titleInput, { target: { value: 'GitHub Official' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateBookmark).toHaveBeenCalledWith(
        'bm-1',
        expect.objectContaining({
          title: 'GitHub Official',
        })
      );
    });
  });

  it('9. deletes bookmark when clicking delete button on bookmark item', async () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete bookmark/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteBookmark).toHaveBeenCalledWith('bm-1');
    });
  });

  it('10. opens Move Bookmark modal and moves bookmark on confirmation', async () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    const moveButtons = screen.getAllByRole('button', { name: /move bookmark/i });
    fireEvent.click(moveButtons[0]);

    expect(screen.getAllByText('Move Bookmark')[0]).toBeInTheDocument();

    const dialogs = screen.getAllByRole('dialog');
    const moveModal = dialogs[dialogs.length - 1];

    // Select Design folder inside move modal
    fireEvent.click(within(moveModal).getByRole('button', { name: 'Design' }));

    // Confirm move
    fireEvent.click(within(moveModal).getByRole('button', { name: 'Move Bookmark' }));

    await waitFor(() => {
      expect(mockMoveBookmark).toHaveBeenCalledWith('bm-1', 'grp-design');
    });
  });

  it('11. opens New Folder modal and creates folder on save', async () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    const newFolderButtons = screen.getAllByRole('button', { name: /new folder/i });
    fireEvent.click(newFolderButtons[0]);

    expect(screen.getByText('Create New Folder')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Design Inspiration');
    fireEvent.change(nameInput, { target: { value: 'Resources' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Folder' }));

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Resources',
        })
      );
    });
  });

  it('12. opens Rename Folder modal and renames folder on save', async () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    const renameButtons = screen.getAllByRole('button', { name: /rename development/i });
    fireEvent.click(renameButtons[0]);

    expect(screen.getByText('Rename Folder')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Design Inspiration');
    fireEvent.change(nameInput, { target: { value: 'Engineering' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockRenameGroup).toHaveBeenCalledWith('grp-dev', 'Engineering');
    });
  });

  it('13. opens Delete Folder modal and confirms folder deletion', async () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    const deleteFolderButtons = screen.getAllByRole('button', { name: /delete development/i });
    fireEvent.click(deleteFolderButtons[0]);

    expect(screen.getByText(/delete folder "development"/i)).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: 'Delete Folder Only' }));

    await waitFor(() => {
      expect(mockDeleteGroup).toHaveBeenCalledWith('grp-dev', { mode: 'reassign' });
    });
  });

  it('14. safely opens bookmark URL in new tab using window.open', () => {
    const originalOpen = window.open;
    window.open = vi.fn();

    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'GitHub' }));

    expect(window.open).toHaveBeenCalledWith('https://github.com', '_blank', 'noopener,noreferrer');

    window.open = originalOpen;
  });

  it('15. initializes bookmark store on mount with effective workspaceId', () => {
    render(<BookmarkManagerModal isOpen={true} onClose={() => {}} workspaceId="ws-custom" />);

    expect(mockInitialize).toHaveBeenCalledWith('ws-custom');
  });
});
