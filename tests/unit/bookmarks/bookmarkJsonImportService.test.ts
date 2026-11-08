import { describe, it, expect } from 'vitest';
import { parseNookSpaceJsonBackup } from '../../../src/features/bookmarks/services/bookmarkJsonImportService';

describe('bookmarkJsonImportService — Milestone 6.7 JSON Backup Parser', () => {
  it('1. successfully parses a valid NookSpace JSON backup', () => {
    const validJson = JSON.stringify({
      format: 'nookspace-bookmarks',
      version: 1,
      exportedAt: 1600000000000,
      data: {
        workspaceId: 'ws-old',
        groups: [
          {
            id: 'grp-source-1',
            title: 'Design',
            color: '#EC4899',
            icon: 'palette',
            order: 0,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        bookmarks: [
          {
            id: 'bm-source-1',
            groupId: 'grp-source-1',
            title: 'Figma',
            url: 'https://figma.com',
            description: 'UI Design tool',
            isFavorite: true,
            order: 0,
            createdAt: 1000,
            updatedAt: 1000,
          },
          {
            id: 'bm-source-2',
            groupId: null,
            title: 'Dribbble',
            url: 'https://dribbble.com',
            isFavorite: false,
            order: 1,
            createdAt: 2000,
            updatedAt: 2000,
          },
        ],
      },
    });

    const result = parseNookSpaceJsonBackup(validJson);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].title).toBe('Design');
    expect(result.bookmarks).toHaveLength(2);
    expect(result.bookmarks[0].title).toBe('Figma');
    expect(result.bookmarks[0].isFavorite).toBe(true);
    expect(result.bookmarks[1].tempGroupId).toBeNull();
    expect(result.rejectedUnsafeUrls).toBe(0);
  });

  it('2. throws on empty string or whitespace', () => {
    expect(() => parseNookSpaceJsonBackup('   ')).toThrow(/empty backup file/i);
  });

  it('3. throws on malformed JSON syntax', () => {
    expect(() => parseNookSpaceJsonBackup('{ invalid json: true')).toThrow(/malformed json/i);
  });

  it('4. throws when format identifier does not match', () => {
    const invalidFormat = JSON.stringify({
      format: 'random-format',
      version: 1,
      exportedAt: 100,
      data: { workspaceId: 'ws', groups: [], bookmarks: [] },
    });

    expect(() => parseNookSpaceJsonBackup(invalidFormat)).toThrow(/unrecognized backup format/i);
  });

  it('5. throws when backup version is unsupported or higher than current', () => {
    const futureVersion = JSON.stringify({
      format: 'nookspace-bookmarks',
      version: 2,
      exportedAt: 100,
      data: { workspaceId: 'ws', groups: [], bookmarks: [] },
    });

    expect(() => parseNookSpaceJsonBackup(futureVersion)).toThrow(
      /unsupported backup version 2/i
    );
  });

  it('6. throws when schema validation fails (missing required fields)', () => {
    const missingFields = JSON.stringify({
      format: 'nookspace-bookmarks',
      version: 1,
      exportedAt: 100,
      data: {
        workspaceId: 'ws',
        // missing groups and bookmarks
      },
    });

    expect(() => parseNookSpaceJsonBackup(missingFields)).toThrow(/invalid backup schema/i);
  });

  it('7. filters out unsafe URLs and records them in invalidEntries', () => {
    const withUnsafe = JSON.stringify({
      format: 'nookspace-bookmarks',
      version: 1,
      exportedAt: 100,
      data: {
        workspaceId: 'ws',
        groups: [],
        bookmarks: [
          {
            id: 'bm-bad',
            groupId: null,
            title: 'Malicious',
            url: 'javascript:alert(1)',
            isFavorite: false,
            order: 0,
            createdAt: 100,
            updatedAt: 100,
          },
          {
            id: 'bm-good',
            groupId: null,
            title: 'Good',
            url: 'https://good.com',
            isFavorite: false,
            order: 1,
            createdAt: 200,
            updatedAt: 200,
          },
        ],
      },
    });

    const result = parseNookSpaceJsonBackup(withUnsafe);

    expect(result.bookmarks).toHaveLength(1);
    expect(result.bookmarks[0].url).toBe('https://good.com');
    expect(result.rejectedUnsafeUrls).toBe(1);
    expect(result.invalidEntries).toHaveLength(1);
    expect(result.invalidEntries[0].title).toBe('Malicious');
  });

  it('8. detects duplicate source IDs and internal duplicate URLs in the file', () => {
    const duplicateData = JSON.stringify({
      format: 'nookspace-bookmarks',
      version: 1,
      exportedAt: 100,
      data: {
        workspaceId: 'ws',
        groups: [
          { id: 'g1', title: 'Folder 1', order: 0, createdAt: 1, updatedAt: 1 },
          { id: 'g1', title: 'Duplicate Folder', order: 1, createdAt: 2, updatedAt: 2 },
        ],
        bookmarks: [
          {
            id: 'b1',
            groupId: null,
            title: 'One',
            url: 'https://example.com',
            order: 0,
            createdAt: 1,
            updatedAt: 1,
          },
          {
            id: 'b2',
            groupId: null,
            title: 'Two',
            url: 'https://example.com', // Duplicate URL
            order: 1,
            createdAt: 2,
            updatedAt: 2,
          },
        ],
      },
    });

    const result = parseNookSpaceJsonBackup(duplicateData);

    // One group accepted, second rejected for duplicate ID
    expect(result.groups).toHaveLength(1);
    expect(result.duplicateBookmarksInFile).toBe(1);
  });
});
