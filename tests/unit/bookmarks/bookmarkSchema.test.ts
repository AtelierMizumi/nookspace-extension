import { describe, it, expect } from 'vitest';
import {
  BookmarkSchema,
  CreateBookmarkSchema,
  UpdateBookmarkSchema,
  BookmarkEntity,
} from '../../../src/types/bookmarks';

describe('BookmarkSchema & Input Schemas — Milestone 6.1', () => {
  const now = Date.now();

  const validBookmark: BookmarkEntity = {
    id: 'bm-uuid-1',
    workspaceId: 'ws-default',
    groupId: 'grp-uuid-1',
    title: 'GitHub Dashboard',
    url: 'https://github.com/dashboard',
    description: 'Personal source repositories and projects',
    iconUrl: 'https://github.githubassets.com/favicons/favicon.png',
    customColor: '#24292E',
    isFavorite: true,
    order: 0,
    createdAt: now,
    updatedAt: now,
  };

  describe('BookmarkSchema (Entity Validation)', () => {
    it('accepts a fully populated valid bookmark with HTTPS URL', () => {
      const parsed = BookmarkSchema.parse(validBookmark);
      expect(parsed).toEqual(validBookmark);
    });

    it('accepts a valid bookmark with HTTP URL', () => {
      const httpBookmark = {
        ...validBookmark,
        url: 'http://insecure.example.com/docs',
      };
      const parsed = BookmarkSchema.parse(httpBookmark);
      expect(parsed.url).toBe('http://insecure.example.com/docs');
    });

    it('accepts a valid bookmark with mailto: URL', () => {
      const mailtoBookmark = {
        ...validBookmark,
        url: 'mailto:contact@nookspace.io',
      };
      const parsed = BookmarkSchema.parse(mailtoBookmark);
      expect(parsed.url).toBe('mailto:contact@nookspace.io');
    });

    it('accepts a bookmark with groupId: null (Uncategorized)', () => {
      const uncategorized = {
        ...validBookmark,
        groupId: null,
      };
      const parsed = BookmarkSchema.parse(uncategorized);
      expect(parsed.groupId).toBeNull();
    });

    it('accepts both favorite and non-favorite bookmarks', () => {
      const fav = BookmarkSchema.parse({ ...validBookmark, isFavorite: true });
      const nonFav = BookmarkSchema.parse({ ...validBookmark, isFavorite: false });
      expect(fav.isFavorite).toBe(true);
      expect(nonFav.isFavorite).toBe(false);
    });

    it('accepts bookmarks with optional metadata omitted', () => {
      const minimal = {
        id: 'bm-min-1',
        workspaceId: 'ws-default',
        groupId: null,
        title: 'Vite Documentation',
        url: 'https://vitejs.dev',
        isFavorite: false,
        order: 1,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = BookmarkSchema.parse(minimal);
      expect(parsed.description).toBeUndefined();
      expect(parsed.iconUrl).toBeUndefined();
      expect(parsed.customColor).toBeUndefined();
    });

    it('treats HTML/XSS-like strings in title and description as plain text (safe boundary)', () => {
      const xssLike = {
        ...validBookmark,
        title: '<script>alert("XSS")</script>',
        description: '<img src=x onerror=alert(1)> & <b>formatting</b>',
      };
      const parsed = BookmarkSchema.parse(xssLike);
      expect(parsed.title).toBe('<script>alert("XSS")</script>');
      expect(parsed.description).toBe('<img src=x onerror=alert(1)> & <b>formatting</b>');
    });

    it('trims whitespace on title during validation', () => {
      const untrimmed = {
        ...validBookmark,
        title: '   Trimmed Title   ',
      };
      const parsed = BookmarkSchema.parse(untrimmed);
      expect(parsed.title).toBe('Trimmed Title');
    });

    it('rejects empty or whitespace-only title', () => {
      expect(() => BookmarkSchema.parse({ ...validBookmark, title: '' })).toThrow(/Title cannot be empty/);
      expect(() => BookmarkSchema.parse({ ...validBookmark, title: '   ' })).toThrow(/Title cannot be empty/);
    });

    it('rejects title exceeding 200 characters', () => {
      expect(() => BookmarkSchema.parse({ ...validBookmark, title: 'B'.repeat(201) })).toThrow(
        /cannot exceed 200 characters/
      );
    });

    it('rejects description exceeding 1000 characters', () => {
      expect(() => BookmarkSchema.parse({ ...validBookmark, description: 'D'.repeat(1001) })).toThrow(
        /cannot exceed 1000 characters/
      );
    });

    it('rejects missing or empty workspaceId', () => {
      expect(() => BookmarkSchema.parse({ ...validBookmark, workspaceId: '' })).toThrow(
        /workspaceId cannot be empty/
      );
      const { workspaceId, ...withoutWs } = validBookmark;
      expect(() => BookmarkSchema.parse(withoutWs)).toThrow();
    });

    it('rejects empty string groupId (must be null or valid non-empty id)', () => {
      expect(() => BookmarkSchema.parse({ ...validBookmark, groupId: '' })).toThrow(
        /groupId cannot be empty string/
      );
    });

    it('rejects negative or fractional order', () => {
      expect(() => BookmarkSchema.parse({ ...validBookmark, order: -1 })).toThrow(/cannot be negative/);
      expect(() => BookmarkSchema.parse({ ...validBookmark, order: 1.5 })).toThrow(/must be an integer/);
    });

    it('rejects negative timestamps', () => {
      expect(() => BookmarkSchema.parse({ ...validBookmark, createdAt: -1 })).toThrow(/cannot be negative/);
      expect(() => BookmarkSchema.parse({ ...validBookmark, updatedAt: -5 })).toThrow(/cannot be negative/);
    });

    it('rejects updatedAt earlier than createdAt', () => {
      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          createdAt: now + 10000,
          updatedAt: now,
        })
      ).toThrow(/updatedAt cannot be earlier than createdAt/);
    });

    it('rejects non-boolean isFavorite', () => {
      expect(() => BookmarkSchema.parse({ ...validBookmark, isFavorite: 'yes' })).toThrow(
        /isFavorite must be a boolean/
      );
    });

    it('rejects prohibited or unsafe URLs via security validation', () => {
      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          url: 'javascript:alert(document.cookie)',
        })
      ).toThrow(/Only safe http:, https:, and mailto: URLs are allowed/);

      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          url: 'data:text/html,<script>alert(1)</script>',
        })
      ).toThrow();

      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          url: 'file:///etc/passwd',
        })
      ).toThrow();

      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          url: 'chrome://settings',
        })
      ).toThrow();

      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          url: 'https://user:pass@example.com',
        })
      ).toThrow();
    });

    it('rejects non-HTTPS or credentialed iconUrl', () => {
      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          iconUrl: 'http://insecure.example.com/icon.png',
        })
      ).toThrow(/Icon URL must be a valid HTTPS URL without credentials/);

      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          iconUrl: 'javascript:alert(1)',
        })
      ).toThrow();
    });

    it('rejects invalid customColor', () => {
      expect(() =>
        BookmarkSchema.parse({
          ...validBookmark,
          customColor: 'rgba(0,0,0,1)',
        })
      ).toThrow(/valid hex color code/);
    });
  });

  describe('CreateBookmarkSchema', () => {
    it('accepts valid creation input and defaults groupId to null and isFavorite to false', () => {
      const input = {
        workspaceId: 'ws-default',
        title: 'New Tab',
        url: 'https://nookspace.io',
      };
      const parsed = CreateBookmarkSchema.parse(input);
      expect(parsed.groupId).toBeNull();
      expect(parsed.isFavorite).toBe(false);
      expect(parsed.title).toBe('New Tab');
      expect(parsed.url).toBe('https://nookspace.io');
    });

    it('rejects unexpected fields (strict schema)', () => {
      const withExtraneous = {
        workspaceId: 'ws-default',
        title: 'New Tab',
        url: 'https://nookspace.io',
        id: 'should-not-be-passed',
        createdAt: Date.now(),
      };
      expect(() => CreateBookmarkSchema.parse(withExtraneous)).toThrow(/unrecognized_keys/);
    });

    it('rejects unsafe URLs at creation time', () => {
      const dangerous = {
        workspaceId: 'ws-default',
        title: 'Dangerous',
        url: 'javascript:stealData()',
      };
      expect(() => CreateBookmarkSchema.parse(dangerous)).toThrow(/Only safe http:, https:, and mailto:/);
    });
  });

  describe('UpdateBookmarkSchema', () => {
    it('accepts partial update of title and url', () => {
      const update = {
        title: 'Updated Title',
        url: 'https://updated.example.com',
      };
      const parsed = UpdateBookmarkSchema.parse(update);
      expect(parsed.title).toBe('Updated Title');
      expect(parsed.url).toBe('https://updated.example.com');
    });

    it('allows clearing optional fields by setting to null', () => {
      const clearing = {
        groupId: null,
        description: null,
        iconUrl: null,
        customColor: null,
      };
      const parsed = UpdateBookmarkSchema.parse(clearing);
      expect(parsed.groupId).toBeNull();
      expect(parsed.description).toBeNull();
      expect(parsed.iconUrl).toBeNull();
      expect(parsed.customColor).toBeNull();
    });

    it('strictly forbids modifying immutable fields (id, workspaceId, createdAt)', () => {
      expect(() =>
        UpdateBookmarkSchema.parse({
          title: 'Hacked',
          id: 'fake-id',
        })
      ).toThrow(/unrecognized_keys/);

      expect(() =>
        UpdateBookmarkSchema.parse({
          title: 'Hacked',
          workspaceId: 'ws-other',
        })
      ).toThrow(/unrecognized_keys/);

      expect(() =>
        UpdateBookmarkSchema.parse({
          createdAt: Date.now(),
        })
      ).toThrow(/unrecognized_keys/);
    });

    it('rejects unsafe URLs in updates', () => {
      expect(() =>
        UpdateBookmarkSchema.parse({
          url: 'javascript:eval("evil")',
        })
      ).toThrow(/Only safe http:, https:, and mailto:/);
    });
  });
});
