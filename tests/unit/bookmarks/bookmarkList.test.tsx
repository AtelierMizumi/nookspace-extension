import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BookmarkList } from '../../../src/features/bookmarks/components/BookmarkList';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';

describe('BookmarkList & BookmarkItem — Milestone 6.5 List View', () => {
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
  ];

  const sampleBookmarks: BookmarkEntity[] = [
    {
      id: 'bm-1',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitHub',
      url: 'https://github.com',
      description: 'Code hosting and collaboration',
      isFavorite: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'bm-2',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'Vite',
      url: 'https://vitejs.dev',
      description: 'Next gen build tool',
      isFavorite: false,
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  it('renders list of bookmarks with title, domain, description, and group badge', () => {
    render(
      <BookmarkList
        bookmarks={sampleBookmarks}
        groups={sampleGroups}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        searchQuery=""
        sortBy="order"
        sortDirection="asc"
        isLoading={false}
        error={null}
        onClearError={() => {}}
        onClearSearch={() => {}}
        onSetSortBy={() => {}}
        onSetSortDirection={() => {}}
        onOpenBookmark={() => {}}
        onToggleFavorite={() => {}}
        onEditBookmark={() => {}}
        onMoveBookmark={() => {}}
        onDeleteBookmark={() => {}}
        onAddBookmark={() => {}}
      />
    );

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('github.com')).toBeInTheDocument();
    expect(screen.getByText('Code hosting and collaboration')).toBeInTheDocument();

    expect(screen.getByText('Vite')).toBeInTheDocument();
    expect(screen.getByText('vitejs.dev')).toBeInTheDocument();
    expect(screen.getAllByText('Development')).toHaveLength(2); // badge on each bookmark item
  });

  it('renders loading state when isLoading is true', () => {
    const { container } = render(
      <BookmarkList
        bookmarks={[]}
        groups={sampleGroups}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        searchQuery=""
        sortBy="order"
        sortDirection="asc"
        isLoading={true}
        error={null}
        onClearError={() => {}}
        onClearSearch={() => {}}
        onSetSortBy={() => {}}
        onSetSortDirection={() => {}}
        onOpenBookmark={() => {}}
        onToggleFavorite={() => {}}
        onEditBookmark={() => {}}
        onMoveBookmark={() => {}}
        onDeleteBookmark={() => {}}
        onAddBookmark={() => {}}
      />
    );

    // Skeletons rendered with animate-shimmer
    expect(container.getElementsByClassName('animate-shimmer').length).toBeGreaterThan(0);
  });

  it('renders search empty state and allows clearing query', () => {
    const handleClearSearch = vi.fn();
    render(
      <BookmarkList
        bookmarks={[]}
        groups={sampleGroups}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        searchQuery="nonexistent"
        sortBy="order"
        sortDirection="asc"
        isLoading={false}
        error={null}
        onClearError={() => {}}
        onClearSearch={handleClearSearch}
        onSetSortBy={() => {}}
        onSetSortDirection={() => {}}
        onOpenBookmark={() => {}}
        onToggleFavorite={() => {}}
        onEditBookmark={() => {}}
        onMoveBookmark={() => {}}
        onDeleteBookmark={() => {}}
        onAddBookmark={() => {}}
      />
    );

    expect(screen.getByText('No matching bookmarks')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));
    expect(handleClearSearch).toHaveBeenCalled();
  });

  it('renders folder empty state with button to add to current folder', () => {
    const handleAdd = vi.fn();
    render(
      <BookmarkList
        bookmarks={[]}
        groups={sampleGroups}
        groupFilter={{ type: 'group', groupId: 'grp-dev' }}
        showFavoritesOnly={false}
        searchQuery=""
        sortBy="order"
        sortDirection="asc"
        isLoading={false}
        error={null}
        onClearError={() => {}}
        onClearSearch={() => {}}
        onSetSortBy={() => {}}
        onSetSortDirection={() => {}}
        onOpenBookmark={() => {}}
        onToggleFavorite={() => {}}
        onEditBookmark={() => {}}
        onMoveBookmark={() => {}}
        onDeleteBookmark={() => {}}
        onAddBookmark={handleAdd}
      />
    );

    expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add to this folder/i }));
    expect(handleAdd).toHaveBeenCalled();
  });

  it('renders error banner and allows dismissing error', () => {
    const handleClearError = vi.fn();
    render(
      <BookmarkList
        bookmarks={sampleBookmarks}
        groups={sampleGroups}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        searchQuery=""
        sortBy="order"
        sortDirection="asc"
        isLoading={false}
        error="Network error or disk quota exceeded"
        onClearError={handleClearError}
        onClearSearch={() => {}}
        onSetSortBy={() => {}}
        onSetSortDirection={() => {}}
        onOpenBookmark={() => {}}
        onToggleFavorite={() => {}}
        onEditBookmark={() => {}}
        onMoveBookmark={() => {}}
        onDeleteBookmark={() => {}}
        onAddBookmark={() => {}}
      />
    );

    expect(screen.getByText('Network error or disk quota exceeded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss error/i }));
    expect(handleClearError).toHaveBeenCalled();
  });

  it('triggers item actions: open, toggle favorite, edit, move, delete', () => {
    const handleOpen = vi.fn();
    const handleToggleFav = vi.fn();
    const handleEdit = vi.fn();
    const handleMove = vi.fn();
    const handleDelete = vi.fn();

    render(
      <BookmarkList
        bookmarks={sampleBookmarks}
        groups={sampleGroups}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        searchQuery=""
        sortBy="order"
        sortDirection="asc"
        isLoading={false}
        error={null}
        onClearError={() => {}}
        onClearSearch={() => {}}
        onSetSortBy={() => {}}
        onSetSortDirection={() => {}}
        onOpenBookmark={handleOpen}
        onToggleFavorite={handleToggleFav}
        onEditBookmark={handleEdit}
        onMoveBookmark={handleMove}
        onDeleteBookmark={handleDelete}
        onAddBookmark={() => {}}
      />
    );

    // Open
    fireEvent.click(screen.getByRole('button', { name: 'GitHub' }));
    expect(handleOpen).toHaveBeenCalledWith(sampleBookmarks[0]);

    // Toggle favorite
    fireEvent.click(screen.getByRole('button', { name: /unfavorite bookmark/i }));
    expect(handleToggleFav).toHaveBeenCalledWith('bm-1');

    // Edit
    fireEvent.click(screen.getAllByRole('button', { name: /edit bookmark/i })[0]);
    expect(handleEdit).toHaveBeenCalledWith(sampleBookmarks[0]);

    // Move
    fireEvent.click(screen.getAllByRole('button', { name: /move bookmark/i })[0]);
    expect(handleMove).toHaveBeenCalledWith(sampleBookmarks[0]);

    // Delete
    fireEvent.click(screen.getAllByRole('button', { name: /delete bookmark/i })[0]);
    expect(handleDelete).toHaveBeenCalledWith('bm-1');
  });

  it('triggers reordering within folder using Move Up and Down buttons', () => {
    const handleReorder = vi.fn();
    render(
      <BookmarkList
        bookmarks={sampleBookmarks}
        groups={sampleGroups}
        groupFilter={{ type: 'group', groupId: 'grp-dev' }}
        showFavoritesOnly={false}
        searchQuery=""
        sortBy="order"
        sortDirection="asc"
        isLoading={false}
        error={null}
        onClearError={() => {}}
        onClearSearch={() => {}}
        onSetSortBy={() => {}}
        onSetSortDirection={() => {}}
        onOpenBookmark={() => {}}
        onToggleFavorite={() => {}}
        onEditBookmark={() => {}}
        onMoveBookmark={() => {}}
        onDeleteBookmark={() => {}}
        onReorderBookmarks={handleReorder}
        onAddBookmark={() => {}}
      />
    );

    // Click Move Down on bm-1
    const moveDownButtons = screen.getAllByRole('button', { name: /move bookmark down/i });
    fireEvent.click(moveDownButtons[0]);

    expect(handleReorder).toHaveBeenCalledWith(['bm-2', 'bm-1'], 'grp-dev');
  });
});
