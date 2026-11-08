import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  CollectionFormModal,
  DeleteCollectionModal,
  TagFormModal,
  DeleteTagModal,
} from '../../../src/features/notes/components/NotesDialogs';
import { NoteCollectionEntity, NoteTagEntity } from '../../../src/types/notes';

describe('NotesDialogs Suite', () => {
  it('1. CollectionFormModal creates and validates collection title', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <CollectionFormModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    expect(screen.getByText('New Collection')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/e\.g\. Work Projects/);
    fireEvent.change(titleInput, { target: { value: 'Design System' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Collection' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        title: 'Design System',
        description: undefined,
        color: '#3b82f6',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('2. DeleteCollectionModal selects between reassign and cascade modes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const col: NoteCollectionEntity = {
      id: 'c1',
      workspaceId: 'ws-1',
      title: 'To Delete',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    };

    render(
      <DeleteCollectionModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        collection={col}
        noteCount={5}
      />
    );

    expect(screen.getByText(/Delete Collection "To Delete"/)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // Default mode is reassign
    fireEvent.click(screen.getByRole('button', { name: 'Delete Collection' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('reassign');
    });
  });

  it('3. TagFormModal creates normalized tag', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <TagFormModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const input = screen.getByPlaceholderText(/e\.g\. productivity/);
    fireEvent.change(input, { target: { value: '  ReactJS  ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Tag' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'reactjs',
        color: '#3b82f6',
      });
    });
  });

  it('4. DeleteTagModal confirms tag deletion', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const tag: NoteTagEntity = {
      id: 't1',
      workspaceId: 'ws-1',
      name: 'deprecated',
      createdAt: 1000,
      updatedAt: 1000,
    };

    render(
      <DeleteTagModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        tag={tag}
        noteCount={3}
      />
    );

    expect(screen.getByText(/Delete Tag "#deprecated"/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Tag' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });
});
