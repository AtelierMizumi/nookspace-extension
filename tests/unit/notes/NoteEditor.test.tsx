import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NoteEditor } from '../../../src/features/notes/components/NoteEditor';
import { NoteEntity } from '../../../src/types/notes';

describe('NoteEditor Suite', () => {
  const mockNote: NoteEntity = {
    id: 'note-1',
    workspaceId: 'ws-1',
    collectionId: null,
    title: 'Initial Title',
    content: '# Hello World\nThis is my note.',
    excerpt: 'Hello World This is my note.',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    tags: ['sample'],
    order: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };

  it('1. renders title, content, toolbar, and word count', () => {
    render(
      <NoteEditor
        note={mockNote}
        collections={[]}
        tags={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('Initial Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Hello World/)).toBeInTheDocument();
    expect(screen.getByText(/words/)).toBeInTheDocument();
  });

  it('2. updates title on blur', () => {
    const onUpdate = vi.fn();
    render(
      <NoteEditor
        note={mockNote}
        collections={[]}
        tags={[]}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
      />
    );

    const titleInput = screen.getByDisplayValue('Initial Title');
    fireEvent.change(titleInput, { target: { value: 'Changed Title' } });
    fireEvent.blur(titleInput);

    expect(onUpdate).toHaveBeenCalledWith('note-1', { title: 'Changed Title' });
  });

  it('3. triggers toggle pin, favorite, and archive', () => {
    const onTogglePin = vi.fn();
    const onToggleFavorite = vi.fn();
    const onToggleArchive = vi.fn();

    render(
      <NoteEditor
        note={mockNote}
        collections={[]}
        tags={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onTogglePin={onTogglePin}
        onToggleFavorite={onToggleFavorite}
        onToggleArchive={onToggleArchive}
      />
    );

    fireEvent.click(screen.getByTitle('Pin Note'));
    expect(onTogglePin).toHaveBeenCalledWith('note-1');

    fireEvent.click(screen.getByTitle('Add to Favorites'));
    expect(onToggleFavorite).toHaveBeenCalledWith('note-1');

    fireEvent.click(screen.getByTitle('Archive Note'));
    expect(onToggleArchive).toHaveBeenCalledWith('note-1');
  });

  it('4. switches view modes between split, edit, and preview', () => {
    render(
      <NoteEditor
        note={mockNote}
        collections={[]}
        tags={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
      />
    );

    // Click Preview only
    fireEvent.click(screen.getByTitle('Preview only'));
    expect(screen.queryByPlaceholderText('Write your note in Markdown...')).toBeNull();

    // Click Edit only
    fireEvent.click(screen.getByTitle('Editor only'));
    expect(screen.getByPlaceholderText('Write your note in Markdown...')).toBeInTheDocument();
  });

  it('5. asks for confirmation before deleting note', () => {
    const onDelete = vi.fn();
    render(
      <NoteEditor
        note={mockNote}
        collections={[]}
        tags={[]}
        onUpdate={vi.fn()}
        onDelete={onDelete}
        onTogglePin={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Delete Note'));
    expect(screen.getByText('Delete?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onDelete).toHaveBeenCalledWith('note-1');
  });
});
