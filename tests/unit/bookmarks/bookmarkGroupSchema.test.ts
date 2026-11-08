import { describe, it, expect } from 'vitest';
import {
  BookmarkGroupSchema,
  CreateBookmarkGroupSchema,
  UpdateBookmarkGroupSchema,
  BookmarkGroupEntity,
} from '../../../src/types/bookmarks';

describe('BookmarkGroupSchema & Input Schemas — Milestone 6.1', () => {
  const now = Date.now();

  const validGroup: BookmarkGroupEntity = {
    id: 'grp-uuid-1',
    workspaceId: 'ws-default',
    title: 'Developer Tools',
    icon: 'code-2',
    color: '#3B82F6',
    order: 0,
    createdAt: now,
    updatedAt: now,
  };

  describe('BookmarkGroupSchema (Entity Validation)', () => {
    it('accepts a fully populated valid bookmark group', () => {
      const parsed = BookmarkGroupSchema.parse(validGroup);
      expect(parsed).toEqual(validGroup);
    });

    it('accepts a valid group with optional icon and color omitted', () => {
      const minimal = {
        id: 'grp-uuid-2',
        workspaceId: 'ws-default',
        title: 'Reading List',
        order: 1,
        createdAt: now,
        updatedAt: now + 1000,
      };
      const parsed = BookmarkGroupSchema.parse(minimal);
      expect(parsed.icon).toBeUndefined();
      expect(parsed.color).toBeUndefined();
      expect(parsed.title).toBe('Reading List');
    });

    it('trims title whitespace on validation', () => {
      const untrimmed = {
        ...validGroup,
        title: '   Trimmed Folder   ',
      };
      const parsed = BookmarkGroupSchema.parse(untrimmed);
      expect(parsed.title).toBe('Trimmed Folder');
    });

    it('rejects empty or whitespace-only title', () => {
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, title: '' })).toThrow();
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, title: '   ' })).toThrow();
    });

    it('rejects title exceeding 100 characters', () => {
      const longTitle = 'A'.repeat(101);
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, title: longTitle })).toThrow(
        /cannot exceed 100 characters/
      );
    });

    it('rejects missing or empty workspaceId', () => {
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, workspaceId: '' })).toThrow(
        /workspaceId cannot be empty/
      );
      const { workspaceId, ...withoutWs } = validGroup;
      expect(() => BookmarkGroupSchema.parse(withoutWs)).toThrow();
    });

    it('rejects negative or fractional order values', () => {
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, order: -1 })).toThrow(
        /cannot be negative/
      );
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, order: 2.5 })).toThrow(
        /must be an integer/
      );
    });

    it('rejects negative timestamps', () => {
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, createdAt: -1 })).toThrow(
        /cannot be negative/
      );
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, updatedAt: -10 })).toThrow(
        /cannot be negative/
      );
    });

    it('rejects updatedAt earlier than createdAt', () => {
      expect(() =>
        BookmarkGroupSchema.parse({
          ...validGroup,
          createdAt: now + 5000,
          updatedAt: now,
        })
      ).toThrow(/updatedAt cannot be earlier than createdAt/);
    });

    it('rejects invalid color formats', () => {
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, color: 'blue' })).toThrow(
        /valid hex color code/
      );
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, color: '123456' })).toThrow();
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, color: '#ZZZZZZ' })).toThrow();
    });

    it('rejects invalid icon formats', () => {
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, icon: 'icon/with/slash' })).toThrow(
        /valid Lucide icon/
      );
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, icon: '<script>' })).toThrow();
      expect(() => BookmarkGroupSchema.parse({ ...validGroup, icon: 'a'.repeat(51) })).toThrow();
    });
  });

  describe('CreateBookmarkGroupSchema', () => {
    it('accepts valid creation input without ID or timestamps', () => {
      const input = {
        workspaceId: 'ws-work',
        title: 'Project Alpha',
        icon: 'folder-git',
        color: '#10B981',
      };
      const parsed = CreateBookmarkGroupSchema.parse(input);
      expect(parsed.workspaceId).toBe('ws-work');
      expect(parsed.title).toBe('Project Alpha');
    });

    it('rejects unexpected fields (strict schema)', () => {
      const inputWithExtraneous = {
        workspaceId: 'ws-work',
        title: 'Project Alpha',
        id: 'should-be-generated-by-service',
        createdAt: Date.now(),
      };
      expect(() => CreateBookmarkGroupSchema.parse(inputWithExtraneous)).toThrow(
        /unrecognized_keys/
      );
    });
  });

  describe('UpdateBookmarkGroupSchema', () => {
    it('accepts valid partial updates', () => {
      const partial = {
        title: 'Renamed Tools',
        color: '#EF4444',
      };
      const parsed = UpdateBookmarkGroupSchema.parse(partial);
      expect(parsed.title).toBe('Renamed Tools');
      expect(parsed.color).toBe('#EF4444');
    });

    it('allows clearing optional fields with null', () => {
      const clearing = {
        icon: null,
        color: null,
      };
      const parsed = UpdateBookmarkGroupSchema.parse(clearing);
      expect(parsed.icon).toBeNull();
      expect(parsed.color).toBeNull();
    });

    it('strictly forbids modifying immutable fields (id, workspaceId)', () => {
      expect(() =>
        UpdateBookmarkGroupSchema.parse({
          title: 'Hacked',
          workspaceId: 'ws-other',
        })
      ).toThrow(/unrecognized_keys/);

      expect(() =>
        UpdateBookmarkGroupSchema.parse({
          id: 'new-id',
        })
      ).toThrow(/unrecognized_keys/);
    });
  });
});
