import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotesNoteList } from '../../../src/features/notes/components/NotesNoteList';
import { NoteEntity } from '../../../src/types/notes';

describe('NotesNoteList Suite', () => {
  const mockNotes: NoteEntity[] = [
    {
      id: 'n1',
      workspaceId: 'ws-1',
      collectionId: null,
      title: 'First Note Title',
      content: 'Content 1',
      excerpt: 'Content 1 excerpt',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['demo'],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'n2',
      workspaceId: 'ws-1',
      collectionId: null,
      title: 'Second Note Title',
      content: 'Content 2',
      excerpt: 'Content 2 excerpt',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      tags: [],
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  it('1. renders note items with titles, excerpts, and tags', () => {
    render(
      <NotesNoteList
        notes={mockNotes}
        collections={[]}
        selectedNoteId="n1"
        searchQuery=""
        viewFilter={{ type: 'all' }}
        selectedTag={null}
        sortBy="updatedAt"
        sortDirection="desc"
        onSelectNote={vi.fn()}
        onSearchChange={vi.fn()}
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onCreateNote={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    expect(screen.getByText('First Note Title')).toBeInTheDocument();
    expect(screen.getByText('Second Note Title')).toBeInTheDocument();
    expect(screen.getByText('Content 1 excerpt')).toBeInTheDocument();
    expect(screen.getByText('#demo')).toBeInTheDocument();
  });

  it('2. triggers search change when user types in search bar', () => {
    const onSearchChange = vi.fn();

    render(
      <NotesNoteList
        notes={mockNotes}
        collections={[]}
        selectedNoteId="n1"
        searchQuery=""
        viewFilter={{ type: 'all' }}
        selectedTag={null}
        sortBy="updatedAt"
        sortDirection="desc"
        onSelectNote={vi.fn()}
        onSearchChange={onSearchChange}
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onCreateNote={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search title, content, tags/);
    fireEvent.change(searchInput, { target: { value: 'react' } });
    expect(onSearchChange).toHaveBeenCalledWith('react');
  });

  it('3. triggers note selection on item click', () => {
    const onSelectNote = vi.fn();

    render(
      <NotesNoteList
        notes={mockNotes}
        collections={[]}
        selectedNoteId="n1"
        searchQuery=""
        viewFilter={{ type: 'all' }}
        selectedTag={null}
        sortBy="updatedAt"
        sortDirection="desc"
        onSelectNote={onSelectNote}
        onSearchChange={vi.fn()}
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onCreateNote={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Second Note Title'));
    expect(onSelectNote).toHaveBeenCalledWith('n2');
  });

  it('4. displays empty search message when search has zero matches', () => {
    render(
      <NotesNoteList
        notes={[]}
        collections={[]}
        selectedNoteId={null}
        searchQuery="nonexistent"
        viewFilter={{ type: 'all' }}
        selectedTag={null}
        sortBy="updatedAt"
        sortDirection="desc"
        onSelectNote={vi.fn()}
        onSearchChange={vi.fn()}
        onSortByChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onCreateNote={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    expect(screen.getByText(/No notes match "nonexistent"/)).toBeInTheDocument();
  });
});
