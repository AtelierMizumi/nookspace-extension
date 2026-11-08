import { describe, it, expect } from 'vitest';
import {
  NoteTagSchema,
  CreateNoteTagSchema,
  UpdateNoteTagSchema,
} from '../../../src/types/notes';

describe('NoteTagSchema Validation Suite', () => {
  const validTag = {
    id: 'tag-1',
    workspaceId: 'ws-default-personal',
    name: 'javascript',
    color: '#3b82f6',
    createdAt: 1000,
    updatedAt: 1000,
  };

  it('validates a valid note tag entity and normalizes name to lowercase', () => {
    const result = NoteTagSchema.safeParse({
      ...validTag,
      name: '  TypeScript  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('typescript');
    }
  });

  it('rejects tag if name is empty or exceeds 50 chars', () => {
    const empty = NoteTagSchema.safeParse({ ...validTag, name: '   ' });
    expect(empty.success).toBe(false);

    const tooLong = NoteTagSchema.safeParse({ ...validTag, name: 'a'.repeat(51) });
    expect(tooLong.success).toBe(false);
  });

  it('validates color hex regex correctly', () => {
    const validHex = NoteTagSchema.safeParse({ ...validTag, color: '#f00' });
    expect(validHex.success).toBe(true);

    const invalidHex = NoteTagSchema.safeParse({ ...validTag, color: 'blue' });
    expect(invalidHex.success).toBe(false);
  });

  it('rejects if updatedAt is earlier than createdAt', () => {
    const invalid = NoteTagSchema.safeParse({
      ...validTag,
      createdAt: 2000,
      updatedAt: 1000,
    });
    expect(invalid.success).toBe(false);
  });

  it('validates CreateNoteTagSchema and normalizes tag name', () => {
    const input = {
      workspaceId: 'ws-default-personal',
      name: '  REACT  ',
      color: '#61dafb',
    };
    const result = CreateNoteTagSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('react');
    }
  });

  it('validates UpdateNoteTagSchema with partial updates', () => {
    const input = {
      name: '  NextJS  ',
      color: null,
    };
    const result = UpdateNoteTagSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('nextjs');
      expect(result.data.color).toBeNull();
    }
  });
});
