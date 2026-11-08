import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FolderSidebar } from '../../../src/features/bookmarks/components/FolderSidebar';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';

describe('FolderSidebar — Milestone 6.5 Navigation Sidebar', () => {
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
      title: 'Reading',
      color: '#10B981',
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  const sampleBookmarks: BookmarkEntity[] = [
    {
      id: 'b-1',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitHub',
      url: 'https://github.com',
      isFavorite: true,
      order: 0,
      createdAt: 100,
      updatedAt: 100,
    },
    {
      id: 'b-2',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitLab',
      url: 'https://gitlab.com',
      isFavorite: false,
      order: 1,
      createdAt: 200,
      updatedAt: 200,
    },
    {
      id: 'b-3',
      workspaceId: 'ws-1',
      groupId: null, // Uncategorized
      title: 'Notion',
      url: 'https://notion.so',
      isFavorite: true,
      order: 0,
      createdAt: 300,
      updatedAt: 300,
    },
  ];

  it('renders system views with correct counts', () => {
    render(
      <FolderSidebar
        groups={sampleGroups}
        bookmarks={sampleBookmarks}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        onSelectAll={() => {}}
        onSelectFavorites={() => {}}
        onSelectUncategorized={() => {}}
        onSelectGroup={() => {}}
        onCreateFolder={() => {}}
        onRenameFolder={() => {}}
        onDeleteFolder={() => {}}
      />
    );

    expect(screen.getByText('All Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // total 3

    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(2); // favorites 2 & development folder 2

    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // uncategorized 1 (Notion)
  });

  it('triggers onSelectAll when All Bookmarks is clicked', () => {
    const handleSelectAll = vi.fn();
    render(
      <FolderSidebar
        groups={sampleGroups}
        bookmarks={sampleBookmarks}
        groupFilter={{ type: 'uncategorized' }}
        showFavoritesOnly={false}
        onSelectAll={handleSelectAll}
        onSelectFavorites={() => {}}
        onSelectUncategorized={() => {}}
        onSelectGroup={() => {}}
        onCreateFolder={() => {}}
        onRenameFolder={() => {}}
        onDeleteFolder={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /all bookmarks/i }));
    expect(handleSelectAll).toHaveBeenCalledTimes(1);
  });

  it('triggers onSelectFavorites when Favorites is clicked', () => {
    const handleSelectFavs = vi.fn();
    render(
      <FolderSidebar
        groups={sampleGroups}
        bookmarks={sampleBookmarks}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        onSelectAll={() => {}}
        onSelectFavorites={handleSelectFavs}
        onSelectUncategorized={() => {}}
        onSelectGroup={() => {}}
        onCreateFolder={() => {}}
        onRenameFolder={() => {}}
        onDeleteFolder={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /favorites/i }));
    expect(handleSelectFavs).toHaveBeenCalledTimes(1);
  });

  it('triggers onSelectUncategorized when Uncategorized is clicked', () => {
    const handleSelectUncat = vi.fn();
    render(
      <FolderSidebar
        groups={sampleGroups}
        bookmarks={sampleBookmarks}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        onSelectAll={() => {}}
        onSelectFavorites={() => {}}
        onSelectUncategorized={handleSelectUncat}
        onSelectGroup={() => {}}
        onCreateFolder={() => {}}
        onRenameFolder={() => {}}
        onDeleteFolder={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /uncategorized/i }));
    expect(handleSelectUncat).toHaveBeenCalledTimes(1);
  });

  it('triggers onSelectGroup when a user folder is clicked', () => {
    const handleSelectGroup = vi.fn();
    render(
      <FolderSidebar
        groups={sampleGroups}
        bookmarks={sampleBookmarks}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        onSelectAll={() => {}}
        onSelectFavorites={() => {}}
        onSelectUncategorized={() => {}}
        onSelectGroup={handleSelectGroup}
        onCreateFolder={() => {}}
        onRenameFolder={() => {}}
        onDeleteFolder={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Development' }));
    expect(handleSelectGroup).toHaveBeenCalledWith('grp-dev');
  });

  it('triggers onCreateFolder when Add Folder icon or New Folder button is clicked', () => {
    const handleCreateFolder = vi.fn();
    render(
      <FolderSidebar
        groups={sampleGroups}
        bookmarks={sampleBookmarks}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        onSelectAll={() => {}}
        onSelectFavorites={() => {}}
        onSelectUncategorized={() => {}}
        onSelectGroup={() => {}}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={() => {}}
        onDeleteFolder={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add folder/i }));
    expect(handleCreateFolder).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /new folder/i }));
    expect(handleCreateFolder).toHaveBeenCalledTimes(2);
  });

  it('triggers onRenameFolder and onDeleteFolder with folder object', () => {
    const handleRename = vi.fn();
    const handleDelete = vi.fn();

    render(
      <FolderSidebar
        groups={sampleGroups}
        bookmarks={sampleBookmarks}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        onSelectAll={() => {}}
        onSelectFavorites={() => {}}
        onSelectUncategorized={() => {}}
        onSelectGroup={() => {}}
        onCreateFolder={() => {}}
        onRenameFolder={handleRename}
        onDeleteFolder={handleDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /rename development/i }));
    expect(handleRename).toHaveBeenCalledWith(sampleGroups[0]);

    fireEvent.click(screen.getByRole('button', { name: /delete development/i }));
    expect(handleDelete).toHaveBeenCalledWith(sampleGroups[0]);
  });

  it('triggers onReorderGroups when move up or down is clicked', () => {
    const handleReorder = vi.fn();
    render(
      <FolderSidebar
        groups={sampleGroups}
        bookmarks={sampleBookmarks}
        groupFilter={{ type: 'all' }}
        showFavoritesOnly={false}
        onSelectAll={() => {}}
        onSelectFavorites={() => {}}
        onSelectUncategorized={() => {}}
        onSelectGroup={() => {}}
        onCreateFolder={() => {}}
        onRenameFolder={() => {}}
        onDeleteFolder={() => {}}
        onReorderGroups={handleReorder}
      />
    );

    // Development is at index 0, so down button should swap [dev, read] to [read, dev]
    fireEvent.click(screen.getByRole('button', { name: /move development down/i }));
    expect(handleReorder).toHaveBeenCalledWith(['grp-read', 'grp-dev']);
  });
});
