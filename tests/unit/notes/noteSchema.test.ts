import { describe, it, expect } from 'vitest';
import {
  NoteSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  generateExcerpt,
} from '../../../src/types/notes';

describe('Note Domain Models & Zod Schemas — Milestone 7.1', () => {
  const now = Date.now();

  const validNote = {
    id: 'note-1',
    workspaceId: 'ws-default',
    collectionId: 'col-1',
    title: 'Research on Local-First Systems',
    content: '# Architecture\nLocal-first software preserves user ownership.',
    excerpt: 'Architecture Local-first software preserves user ownership.',
    isPinned: false,
    isFavorite: true,
    isArchived: false,
    color: '#3B82F6',
    tags: ['local-first', 'architecture'],
    order: 0,
    createdAt: now - 1000,
    updatedAt: now,
  };

  describe('1. generateExcerpt Utility', () => {
    it('returns empty string for empty content', () => {
      expect(generateExcerpt('')).toBe('');
    });

    it('strips markdown headers, bold, italics, code blocks, and links', () => {
      const md = `
        # Header 1
        This is **bold** and *italic* text with [a link](https://example.com) and \`inline code\`.
        > A wise quote
        - List item 1
        - List item 2
      `;
      const excerpt = generateExcerpt(md);
      expect(excerpt).not.toContain('#');
      expect(excerpt).not.toContain('**');
      expect(excerpt).not.toContain('[');
      expect(excerpt).not.toContain('https://example.com');
      expect(excerpt).toContain('Header 1');
      expect(excerpt).toContain('This is bold and italic text with a link and inline code.');
      expect(excerpt).toContain('A wise quote');
    });

    it('truncates content exceeding maxLength with ellipsis', () => {
      const longText = 'A'.repeat(400);
      const excerpt = generateExcerpt(longText, 50);
      expect(excerpt.length).toBeLessThanOrEqual(53);
      expect(excerpt.endsWith('...')).toBe(true);
    });
  });

  describe('2. NoteSchema Validation', () => {
    it('successfully parses a complete, valid note entity', () => {
      const parsed = NoteSchema.parse(validNote);
      expect(parsed.id).toBe('note-1');
      expect(parsed.tags).toEqual(['local-first', 'architecture']);
      expect(parsed.isFavorite).toBe(true);
    });

    it('allows collectionId to be null for Uncategorized notes', () => {
      const uncatNote = { ...validNote, collectionId: null };
      const parsed = NoteSchema.parse(uncatNote);
      expect(parsed.collectionId).toBeNull();
    });

    it('rejects empty id or empty workspaceId', () => {
      expect(() => NoteSchema.parse({ ...validNote, id: '' })).toThrow();
      expect(() => NoteSchema.parse({ ...validNote, workspaceId: '  ' })).toThrow();
    });

    it('rejects empty title or title exceeding 200 characters', () => {
      expect(() => NoteSchema.parse({ ...validNote, title: '' })).toThrow();
      expect(() => NoteSchema.parse({ ...validNote, title: '   ' })).toThrow();
      expect(() => NoteSchema.parse({ ...validNote, title: 'A'.repeat(201) })).toThrow();
    });

    it('trims leading and trailing whitespace from title', () => {
      const parsed = NoteSchema.parse({ ...validNote, title: '  Trimmed Title  ' });
      expect(parsed.title).toBe('Trimmed Title');
    });

    it('rejects invalid hex color format', () => {
      expect(() => NoteSchema.parse({ ...validNote, color: 'blue' })).toThrow();
      expect(() => NoteSchema.parse({ ...validNote, color: '#12345' })).toThrow();
      expect(() => NoteSchema.parse({ ...validNote, color: '#ZZZZZZ' })).toThrow();
    });

    it('accepts valid 3-char and 6-char hex color codes', () => {
      expect(NoteSchema.parse({ ...validNote, color: '#FFF' }).color).toBe('#FFF');
      expect(NoteSchema.parse({ ...validNote, color: '#3B82F6' }).color).toBe('#3B82F6');
    });

    it('rejects negative order or floating point order', () => {
      expect(() => NoteSchema.parse({ ...validNote, order: -1 })).toThrow();
      expect(() => NoteSchema.parse({ ...validNote, order: 2.5 })).toThrow();
    });

    it('rejects when updatedAt is earlier than createdAt', () => {
      expect(() =>
        NoteSchema.parse({
          ...validNote,
          createdAt: 1000,
          updatedAt: 500,
        })
      ).toThrow(/updatedAt cannot be earlier than createdAt/);
    });
  });

  describe('3. CreateNoteSchema Validation', () => {
    it('applies default values for collectionId, flags, and tags', () => {
      const input = {
        workspaceId: 'ws-1',
        title: 'New Note',
        content: 'Simple body',
      };
      const parsed = CreateNoteSchema.parse(input);
      expect(parsed.collectionId).toBeNull();
      expect(parsed.isPinned).toBe(false);
      expect(parsed.isFavorite).toBe(false);
      expect(parsed.isArchived).toBe(false);
      expect(parsed.tags).toEqual([]);
    });

    it('rejects extra unrecognized properties due to strict mode', () => {
      const input = {
        workspaceId: 'ws-1',
        title: 'New Note',
        unknownProp: 'malicious',
      };
      expect(() => CreateNoteSchema.parse(input)).toThrow();
    });
  });

  describe('4. UpdateNoteSchema Validation', () => {
    it('allows partial updates and nullable collectionId / color', () => {
      const update = {
        title: 'Updated Title',
        collectionId: null,
        color: null,
        isPinned: true,
      };
      const parsed = UpdateNoteSchema.parse(update);
      expect(parsed.title).toBe('Updated Title');
      expect(parsed.collectionId).toBeNull();
      expect(parsed.color).toBeNull();
      expect(parsed.isPinned).toBe(true);
    });

    it('rejects invalid fields in update', () => {
      expect(() => UpdateNoteSchema.parse({ title: '' })).toThrow();
      expect(() => UpdateNoteSchema.parse({ color: 'invalid' })).toThrow();
      expect(() => UpdateNoteSchema.parse({ order: -5 })).toThrow();
    });
  });
});
