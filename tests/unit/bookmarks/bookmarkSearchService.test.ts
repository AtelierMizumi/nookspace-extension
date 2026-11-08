import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  tokenizeQuery,
  scoreBookmark,
  filterAndSortBookmarks,
} from '../../../src/features/bookmarks/services/bookmarkSearchService';
import { BookmarkEntity } from '../../../src/types/bookmarks';

describe('BookmarkSearchService — Milestone 6.3 Local Search Engine', () => {
  const sampleBookmarks: BookmarkEntity[] = [
    {
      id: 'bm-1',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitHub',
      url: 'https://github.com',
      description: 'Code hosting platform and version control',
      isFavorite: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'bm-2',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitHub Actions Documentation',
      url: 'https://docs.github.com/en/actions',
      description: 'Automate developer workflows with CI/CD',
      isFavorite: false,
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
    {
      id: 'bm-3',
      workspaceId: 'ws-1',
      groupId: 'grp-read',
      title: 'Hacker News',
      url: 'https://news.ycombinator.com',
      description: 'Tech articles and startup community discussions',
      isFavorite: true,
      order: 0,
      createdAt: 3000,
      updatedAt: 3000,
    },
    {
      id: 'bm-4',
      workspaceId: 'ws-1',
      groupId: null, // Uncategorized
      title: 'Linear',
      url: 'https://linear.app',
      description: undefined, // test undefined description
      isFavorite: false,
      order: 0,
      createdAt: 4000,
      updatedAt: 4000,
    },
    {
      id: 'bm-5',
      workspaceId: 'ws-1',
      groupId: null, // Uncategorized
      title: 'Vite Next Generation Bundler',
      url: 'https://vitejs.dev',
      description: 'Frontend tooling powered by esbuild and rollup',
      isFavorite: true,
      order: 1,
      createdAt: 5000,
      updatedAt: 5000,
    },
  ];

  describe('extractDomain', () => {
    it('extracts normalized domain without www and protocol', () => {
      expect(extractDomain('https://www.github.com/nookspace')).toBe('github.com');
      expect(extractDomain('http://linear.app/team')).toBe('linear.app');
      expect(extractDomain('https://sub.domain.co.uk:8080/path')).toBe('sub.domain.co.uk');
    });

    it('returns empty string on malformed URLs gracefully', () => {
      expect(extractDomain('not-a-valid-url')).toBe('');
      expect(extractDomain('')).toBe('');
    });
  });

  describe('tokenizeQuery', () => {
    it('splits query by whitespace and lowers casing', () => {
      expect(tokenizeQuery('  React  Vite   Hooks  ')).toEqual(['react', 'vite', 'hooks']);
      expect(tokenizeQuery('')).toEqual([]);
      expect(tokenizeQuery('   ')).toEqual([]);
    });
  });

  describe('scoreBookmark & Relevance Ranking', () => {
    it('prioritizes exact title match over prefix and partial matches', () => {
      const exact = scoreBookmark(sampleBookmarks[0], 'GitHub', ['github']);
      const prefix = scoreBookmark(sampleBookmarks[1], 'GitHub', ['github']);
      expect(exact).toBeGreaterThan(prefix);
    });

    it('scores title prefix higher than contains or description match', () => {
      const itemTitlePrefix: BookmarkEntity = {
        id: '1',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'React Documentation',
        url: 'https://react.dev',
        order: 0,
        createdAt: 1,
        updatedAt: 1,
        isFavorite: false,
      };

      const itemDescOnly: BookmarkEntity = {
        id: '2',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'Front End Guide',
        url: 'https://guide.com',
        description: 'Contains React guides and tutorials',
        order: 1,
        createdAt: 2,
        updatedAt: 2,
        isFavorite: false,
      };

      const scorePrefix = scoreBookmark(itemTitlePrefix, 'react', ['react']);
      const scoreDesc = scoreBookmark(itemDescOnly, 'react', ['react']);
      expect(scorePrefix).toBeGreaterThan(scoreDesc);
    });

    it('matches domain and URL searches', () => {
      const byDomain = scoreBookmark(sampleBookmarks[2], 'ycombinator.com', ['ycombinator.com']);
      expect(byDomain).toBeGreaterThan(0);

      const byUrl = scoreBookmark(sampleBookmarks[0], 'https://github.com', ['https://github.com']);
      expect(byUrl).toBeGreaterThan(0);
    });

    it('requires ALL tokens to match (AND logic)', () => {
      // 'github actions' matches bm-2 (both words present), but NOT bm-1 (only github present)
      const tokens = ['github', 'actions'];
      const scoreBm1 = scoreBookmark(sampleBookmarks[0], 'github actions', tokens);
      const scoreBm2 = scoreBookmark(sampleBookmarks[1], 'github actions', tokens);

      expect(scoreBm1).toBe(-1); // Excluded
      expect(scoreBm2).toBeGreaterThan(0); // Included
    });

    it('handles undefined or null description without crashing', () => {
      expect(() => scoreBookmark(sampleBookmarks[3], 'linear', ['linear'])).not.toThrow();
      const score = scoreBookmark(sampleBookmarks[3], 'linear', ['linear']);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('filterAndSortBookmarks', () => {
    it('returns all bookmarks when search query is empty or whitespace', () => {
      const resEmpty = filterAndSortBookmarks(sampleBookmarks, { searchQuery: '' });
      expect(resEmpty).toHaveLength(sampleBookmarks.length);

      const resWhitespace = filterAndSortBookmarks(sampleBookmarks, { searchQuery: '   ' });
      expect(resWhitespace).toHaveLength(sampleBookmarks.length);
    });

    it('performs case-insensitive search and ranks by relevance', () => {
      const results = filterAndSortBookmarks(sampleBookmarks, { searchQuery: 'GITHUB' });
      expect(results).toHaveLength(2);
      // 'GitHub' (exact title) should rank before 'GitHub Actions Documentation' (prefix)
      expect(results[0].title).toBe('GitHub');
      expect(results[1].title).toBe('GitHub Actions Documentation');
    });

    it('filters by activeGroupId: specific group', () => {
      const results = filterAndSortBookmarks(sampleBookmarks, { activeGroupId: 'grp-dev' });
      expect(results).toHaveLength(2);
      expect(results.every((b) => b.groupId === 'grp-dev')).toBe(true);
    });

    it('filters by activeGroupId: null (Uncategorized)', () => {
      const results = filterAndSortBookmarks(sampleBookmarks, { activeGroupId: null });
      expect(results).toHaveLength(2);
      expect(results.every((b) => b.groupId === null)).toBe(true);
    });

    it('supports discriminated union BookmarkGroupFilter: all, uncategorized, and specific group', () => {
      // 1. All: returns bookmarks across all groups and uncategorized
      const allResults = filterAndSortBookmarks(sampleBookmarks, {
        groupFilter: { type: 'all' },
      });
      expect(allResults).toHaveLength(sampleBookmarks.length);

      // 2. Uncategorized: returns strictly bookmarks where groupId === null
      const uncategorizedResults = filterAndSortBookmarks(sampleBookmarks, {
        groupFilter: { type: 'uncategorized' },
      });
      expect(uncategorizedResults).toHaveLength(2);
      expect(uncategorizedResults.every((b) => b.groupId === null)).toBe(true);
      expect(uncategorizedResults.map((b) => b.id)).toEqual(['bm-4', 'bm-5']);

      // 3. Specific group: returns strictly bookmarks belonging to specified groupId
      const groupResults = filterAndSortBookmarks(sampleBookmarks, {
        groupFilter: { type: 'group', groupId: 'grp-dev' },
      });
      expect(groupResults).toHaveLength(2);
      expect(groupResults.every((b) => b.groupId === 'grp-dev')).toBe(true);
      expect(groupResults.map((b) => b.id)).toEqual(['bm-1', 'bm-2']);
    });

    it('combines discriminated union BookmarkGroupFilter with search and favorites', () => {
      // In uncategorized, only bm-5 is favorite
      const uncategorizedFavs = filterAndSortBookmarks(sampleBookmarks, {
        groupFilter: { type: 'uncategorized' },
        showFavoritesOnly: true,
      });
      expect(uncategorizedFavs).toHaveLength(1);
      expect(uncategorizedFavs[0].id).toBe('bm-5');

      // In uncategorized with search
      const uncategorizedSearch = filterAndSortBookmarks(sampleBookmarks, {
        groupFilter: { type: 'uncategorized' },
        searchQuery: 'vite',
      });
      expect(uncategorizedSearch).toHaveLength(1);
      expect(uncategorizedSearch[0].id).toBe('bm-5');
    });

    it('filters by showFavoritesOnly: true', () => {
      const results = filterAndSortBookmarks(sampleBookmarks, { showFavoritesOnly: true });
      expect(results).toHaveLength(3);
      expect(results.every((b) => b.isFavorite)).toBe(true);
    });

    it('combines search query, group filter, and favorites filter simultaneously', () => {
      // In 'grp-dev', only bm-1 is favorite
      const results = filterAndSortBookmarks(sampleBookmarks, {
        searchQuery: 'git',
        activeGroupId: 'grp-dev',
        showFavoritesOnly: true,
      });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('GitHub');
    });

    it('sorts by title ascending and descending when not searching', () => {
      const asc = filterAndSortBookmarks(sampleBookmarks, { sortBy: 'title', sortDirection: 'asc' });
      expect(asc[0].title).toBe('GitHub'); // G
      expect(asc[asc.length - 1].title).toBe('Vite Next Generation Bundler'); // V

      const desc = filterAndSortBookmarks(sampleBookmarks, { sortBy: 'title', sortDirection: 'desc' });
      expect(desc[0].title).toBe('Vite Next Generation Bundler');
      expect(desc[desc.length - 1].title).toBe('GitHub');
    });

    it('sorts by createdAt and updatedAt when specified', () => {
      const byCreated = filterAndSortBookmarks(sampleBookmarks, { sortBy: 'createdAt', sortDirection: 'desc' });
      expect(byCreated[0].id).toBe('bm-5'); // 5000ms
      expect(byCreated[byCreated.length - 1].id).toBe('bm-1'); // 1000ms
    });

    it('sorts by updatedAt ascending and descending without mutating input array', () => {
      const itemsWithUpdated: BookmarkEntity[] = [
        {
          id: 'u-1',
          workspaceId: 'ws-1',
          groupId: null,
          title: 'Older Updated',
          url: 'https://older.com',
          order: 0,
          createdAt: 1000,
          updatedAt: 2000,
          isFavorite: false,
        },
        {
          id: 'u-2',
          workspaceId: 'ws-1',
          groupId: null,
          title: 'Newer Updated',
          url: 'https://newer.com',
          order: 1,
          createdAt: 500,
          updatedAt: 9000,
          isFavorite: false,
        },
        {
          id: 'u-3',
          workspaceId: 'ws-1',
          groupId: null,
          title: 'Middle Updated',
          url: 'https://middle.com',
          order: 2,
          createdAt: 2000,
          updatedAt: 5000,
          isFavorite: false,
        },
      ];

      const copyBefore = JSON.parse(JSON.stringify(itemsWithUpdated));

      const desc = filterAndSortBookmarks(itemsWithUpdated, {
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      });
      expect(desc.map((b) => b.id)).toEqual(['u-2', 'u-3', 'u-1']);

      const asc = filterAndSortBookmarks(itemsWithUpdated, {
        sortBy: 'updatedAt',
        sortDirection: 'asc',
      });
      expect(asc.map((b) => b.id)).toEqual(['u-1', 'u-3', 'u-2']);

      // Assert input immutability
      expect(itemsWithUpdated).toEqual(copyBefore);
    });

    it('does not mutate the original bookmarks array or entities', () => {
      const copyBefore = JSON.parse(JSON.stringify(sampleBookmarks));
      filterAndSortBookmarks(sampleBookmarks, {
        searchQuery: 'git',
        sortBy: 'title',
        sortDirection: 'desc',
      });
      expect(sampleBookmarks).toEqual(copyBefore);
    });

    it('provides deterministic tie-breaking for equal scores', () => {
      const bmA: BookmarkEntity = {
        id: 'bm-tie-1',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'App A',
        url: 'https://a.com',
        order: 1,
        createdAt: 100,
        updatedAt: 100,
        isFavorite: false,
      };
      const bmB: BookmarkEntity = {
        id: 'bm-tie-2',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'App B',
        url: 'https://b.com',
        order: 2,
        createdAt: 200,
        updatedAt: 200,
        isFavorite: false,
      };

      const res = filterAndSortBookmarks([bmB, bmA], { searchQuery: 'App' });
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe('bm-tie-1'); // lower order wins tie
      expect(res[1].id).toBe('bm-tie-2');
    });
  });
});
