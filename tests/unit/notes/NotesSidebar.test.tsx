import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotesSidebar } from '../../../src/features/notes/components/NotesSidebar';
import { NoteEntity, NoteCollectionEntity, NoteTagEntity } from '../../../src/types/notes';

describe('NotesSidebar Suite', () => {
  const mockNotes: NoteEntity[] = [
    {
      id: 'n1',
      workspaceId: 'ws-1',
      collectionId: 'c1',
      title: 'Active Note 1',
      content: '',
      excerpt: '',
      isPinned: true,
      isFavorite: false,
      isArchived: false,
      tags: ['react'],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'n2',
      workspaceId: 'ws-1',
      collectionId: null,
      title: 'Active Note 2',
      content: '',
      excerpt: '',
      isPinned: false,
      isFavorite: true,
      isArchived: false,
      tags: ['typescript'],
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
    {
      id: 'n3',
      workspaceId: 'ws-1',
      collectionId: null,
      title: 'Archived Note',
      content: '',
      excerpt: '',
      isPinned: false,
      isFavorite: false,
      isArchived: true,
      tags: [],
      order: 2,
      createdAt: 3000,
      updatedAt: 3000,
    },
  ];

  const mockCollections: NoteCollectionEntity[] = [
    {
      id: 'c1',
      workspaceId: 'ws-1',
      title: 'Projects',
      color: '#3b82f6',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  const mockTags: NoteTagEntity[] = [
    {
      id: 't1',
      workspaceId: 'ws-1',
      name: 'react',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 't2',
      workspaceId: 'ws-1',
      name: 'typescript',
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  it('1. renders system views with accurate note counts', () => {
    render(
      <NotesSidebar
        notes={mockNotes}
        collections={mockCollections}
        tags={mockTags}
        viewFilter={{ type: 'all' }}
        selectedTag={null}
        onSelectView={vi.fn()}
        onSelectTag={vi.fn()}
        onOpenCreateCollection={vi.fn()}
        onOpenEditCollection={vi.fn()}
        onOpenDeleteCollection={vi.fn()}
        onOpenCreateTag={vi.fn()}
        onOpenEditTag={vi.fn()}
        onOpenDeleteTag={vi.fn()}
      />
    );

    expect(screen.getByText('All Notes')).toBeInTheDocument();
    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('2. triggers view selection when a system view is clicked', () => {
    const onSelectView = vi.fn();
    const onSelectTag = vi.fn();

    render(
      <NotesSidebar
        notes={mockNotes}
        collections={mockCollections}
        tags={mockTags}
        viewFilter={{ type: 'all' }}
        selectedTag={null}
        onSelectView={onSelectView}
        onSelectTag={onSelectTag}
        onOpenCreateCollection={vi.fn()}
        onOpenEditCollection={vi.fn()}
        onOpenDeleteCollection={vi.fn()}
        onOpenCreateTag={vi.fn()}
        onOpenEditTag={vi.fn()}
        onOpenDeleteTag={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Pinned'));
    expect(onSelectView).toHaveBeenCalledWith({ type: 'pinned' });
    expect(onSelectTag).toHaveBeenCalledWith(null);
  });

  it('3. triggers tag selection when a tag is clicked', () => {
    const onSelectTag = vi.fn();

    render(
      <NotesSidebar
        notes={mockNotes}
        collections={mockCollections}
        tags={mockTags}
        viewFilter={{ type: 'all' }}
        selectedTag={null}
        onSelectView={vi.fn()}
        onSelectTag={onSelectTag}
        onOpenCreateCollection={vi.fn()}
        onOpenEditCollection={vi.fn()}
        onOpenDeleteCollection={vi.fn()}
        onOpenCreateTag={vi.fn()}
        onOpenEditTag={vi.fn()}
        onOpenDeleteTag={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('react'));
    expect(onSelectTag).toHaveBeenCalledWith('react');
  });

  it('4. triggers collection create and tag create modal openers', () => {
    const onOpenCreateCol = vi.fn();
    const onOpenCreateTag = vi.fn();

    render(
      <NotesSidebar
        notes={mockNotes}
        collections={mockCollections}
        tags={mockTags}
        viewFilter={{ type: 'all' }}
        selectedTag={null}
        onSelectView={vi.fn()}
        onSelectTag={vi.fn()}
        onOpenCreateCollection={onOpenCreateCol}
        onOpenEditCollection={vi.fn()}
        onOpenDeleteCollection={vi.fn()}
        onOpenCreateTag={onOpenCreateTag}
        onOpenEditTag={vi.fn()}
        onOpenDeleteTag={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Create Collection'));
    expect(onOpenCreateCol).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Create Tag'));
    expect(onOpenCreateTag).toHaveBeenCalled();
  });
});
