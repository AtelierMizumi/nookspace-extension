import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useNoteStore } from '../../../src/features/notes/stores/noteStore';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';
import { NotesManagerModal } from '../../../src/features/notes/components/NotesManagerModal';
import { NoteEntity, NoteCollectionEntity, NoteTagEntity } from '../../../src/types/notes';

describe('NotesManagerModal Integration Suite', () => {
  const ws1 = 'ws-test-1';

  const mockNotes: NoteEntity[] = [
    {
      id: 'note-1',
      workspaceId: ws1,
      collectionId: 'col-1',
      title: 'First Seed Note',
      content: '# First Note\nInitial text.',
      excerpt: 'First Note Initial text.',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['guide'],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  const mockCollections: NoteCollectionEntity[] = [
    {
      id: 'col-1',
      workspaceId: ws1,
      title: 'Roadmap',
      color: '#3b82f6',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  const mockTags: NoteTagEntity[] = [
    {
      id: 'tag-1',
      workspaceId: ws1,
      name: 'guide',
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useWorkspaceStore.setState({
      activeWorkspaceId: ws1,
      workspaces: [{ id: ws1, name: 'Personal Space', icon: 'Sparkles', isDefault: true, order: 0, createdAt: 1, updatedAt: 1 }],
    });

    useNoteStore.setState({
      notes: mockNotes,
      collections: mockCollections,
      tags: mockTags,
      selectedNoteId: 'note-1',
      activeWorkspaceId: ws1,
      isLoading: false,
      isInitialized: true,
      error: null,
      searchQuery: '',
      viewFilter: { type: 'all' },
      selectedTag: null,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
      initialize: vi.fn().mockResolvedValue(undefined),
      createNote: vi.fn().mockImplementation((input) => {
        const created: NoteEntity = {
          id: 'note-new',
          workspaceId: ws1,
          collectionId: input.collectionId || null,
          title: input.title || 'Untitled Note',
          content: input.content || '',
          excerpt: '',
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          tags: input.tags || [],
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        useNoteStore.setState((s) => ({ notes: [created, ...s.notes], selectedNoteId: created.id }));
        return Promise.resolve(created);
      }),
    });
  });

  it('1. renders modal container, header, sidebar, list, and editor when open', async () => {
    render(
      <NotesManagerModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId={ws1}
      />
    );

    expect(screen.getByText('Notes & Knowledge')).toBeInTheDocument();
    expect(screen.getAllByText('All Notes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('First Seed Note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('First Seed Note')).toBeInTheDocument();
  });

  it('2. does not render anything when isOpen is false', () => {
    const { container } = render(
      <NotesManagerModal
        isOpen={false}
        onClose={vi.fn()}
        workspaceId={ws1}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('3. closes modal when close (X) button is clicked', () => {
    const onClose = vi.fn();
    render(
      <NotesManagerModal
        isOpen={true}
        onClose={onClose}
        workspaceId={ws1}
      />
    );

    fireEvent.click(screen.getByTitle('Close (Esc)'));
    expect(onClose).toHaveBeenCalled();
  });

  it('4. creates a new note when clicking New Note in the list header', async () => {
    render(
      <NotesManagerModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId={ws1}
      />
    );

    fireEvent.click(screen.getByTitle('Create Note'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Untitled Note')).toBeInTheDocument();
    });
  });

  it('5. navigates between system views in sidebar and updates note list', async () => {
    render(
      <NotesManagerModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId={ws1}
      />
    );

    // Click Favorites in sidebar
    fireEvent.click(screen.getByText('Favorites'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Favorite Notes' })).toBeInTheDocument();
    });
  });
});
