import { describe, it, expect } from 'vitest';
import {
  NoteCollectionSchema,
  CreateNoteCollectionSchema,
  UpdateNoteCollectionSchema,
} from '../../../src/types/notes';

describe('NoteCollection Domain Models & Schemas — Milestone 7.1', () => {
  const now = Date.now();

  const validCollection = {
    id: 'col-work',
    workspaceId: 'ws-1',
    title: 'Work & Projects',
    description: 'Active work items and project specs',
    color: '#6366F1',
    icon: 'folder',
    order: 0,
    createdAt: now - 1000,
    updatedAt: now,
  };

  describe('1. NoteCollectionSchema Validation', () => {
    it('successfully validates a valid collection entity', () => {
      const parsed = NoteCollectionSchema.parse(validCollection);
      expect(parsed.id).toBe('col-work');
      expect(parsed.title).toBe('Work & Projects');
    });

    it('rejects empty title or title exceeding 100 characters', () => {
      expect(() => NoteCollectionSchema.parse({ ...validCollection, title: '' })).toThrow();
      expect(() => NoteCollectionSchema.parse({ ...validCollection, title: '  ' })).toThrow();
      expect(() => NoteCollectionSchema.parse({ ...validCollection, title: 'A'.repeat(101) })).toThrow();
    });

    it('validates color as hex code', () => {
      expect(() => NoteCollectionSchema.parse({ ...validCollection, color: 'red' })).toThrow();
      expect(NoteCollectionSchema.parse({ ...validCollection, color: '#10B981' }).color).toBe('#10B981');
    });

    it('validates icon as lowercase Lucide identifier', () => {
      expect(() => NoteCollectionSchema.parse({ ...validCollection, icon: 'Folder Icon!' })).toThrow();
      expect(NoteCollectionSchema.parse({ ...validCollection, icon: 'folder-code' }).icon).toBe('folder-code');
    });

    it('rejects updatedAt earlier than createdAt', () => {
      expect(() =>
        NoteCollectionSchema.parse({
          ...validCollection,
          createdAt: 5000,
          updatedAt: 4000,
        })
      ).toThrow(/updatedAt cannot be earlier than createdAt/);
    });
  });

  describe('2. CreateNoteCollectionSchema Validation', () => {
    it('parses valid input with optional fields', () => {
      const input = {
        workspaceId: 'ws-1',
        title: 'Personal Journal',
        color: '#EC4899',
      };
      const parsed = CreateNoteCollectionSchema.parse(input);
      expect(parsed.title).toBe('Personal Journal');
      expect(parsed.color).toBe('#EC4899');
      expect(parsed.order).toBeUndefined();
    });

    it('rejects extra unrecognized fields in strict mode', () => {
      expect(() =>
        CreateNoteCollectionSchema.parse({
          workspaceId: 'ws-1',
          title: 'Title',
          extra: 123,
        })
      ).toThrow();
    });
  });

  describe('3. UpdateNoteCollectionSchema Validation', () => {
    it('allows updating fields and setting color / icon / description to null', () => {
      const update = {
        title: 'New Title',
        description: null,
        color: null,
        icon: null,
      };
      const parsed = UpdateNoteCollectionSchema.parse(update);
      expect(parsed.title).toBe('New Title');
      expect(parsed.description).toBeNull();
      expect(parsed.color).toBeNull();
      expect(parsed.icon).toBeNull();
    });
  });
});
