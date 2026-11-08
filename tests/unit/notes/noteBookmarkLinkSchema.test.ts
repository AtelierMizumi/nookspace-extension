import { describe, it, expect } from 'vitest';
import {
  NoteBookmarkLinkSchema,
  CreateNoteBookmarkLinkSchema,
} from '../../../src/types/notes';

describe('NoteBookmarkLinkSchema Validation Suite', () => {
  const validLink = {
    id: 'nbl-1',
    workspaceId: 'ws-default-personal',
    noteId: 'note-1',
    bookmarkId: 'bm-1',
    createdAt: 1000,
  };

  it('validates a valid note-bookmark link entity', () => {
    const result = NoteBookmarkLinkSchema.safeParse(validLink);
    expect(result.success).toBe(true);
  });

  it('rejects invalid or missing IDs', () => {
    expect(NoteBookmarkLinkSchema.safeParse({ ...validLink, id: '' }).success).toBe(false);
    expect(NoteBookmarkLinkSchema.safeParse({ ...validLink, workspaceId: '' }).success).toBe(false);
    expect(NoteBookmarkLinkSchema.safeParse({ ...validLink, noteId: '' }).success).toBe(false);
    expect(NoteBookmarkLinkSchema.safeParse({ ...validLink, bookmarkId: '' }).success).toBe(false);
  });

  it('rejects negative or non-integer timestamp', () => {
    expect(NoteBookmarkLinkSchema.safeParse({ ...validLink, createdAt: -10 }).success).toBe(false);
    expect(NoteBookmarkLinkSchema.safeParse({ ...validLink, createdAt: 12.34 }).success).toBe(false);
  });

  it('validates CreateNoteBookmarkLinkSchema', () => {
    const input = {
      workspaceId: 'ws-default-personal',
      noteId: 'note-1',
      bookmarkId: 'bm-1',
    };
    const result = CreateNoteBookmarkLinkSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects extra unrecognized properties in CreateNoteBookmarkLinkSchema', () => {
    const input = {
      workspaceId: 'ws-default-personal',
      noteId: 'note-1',
      bookmarkId: 'bm-1',
      extraField: 'not allowed',
    };
    const result = CreateNoteBookmarkLinkSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
