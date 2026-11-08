import { BookmarkEntity } from '../../../types/bookmarks';

export type BookmarkSortField = 'order' | 'title' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

/**
 * Discriminated union representing the three group filtering states:
 * - 'all': returns bookmarks across all groups plus uncategorized
 * - 'uncategorized': returns only bookmarks where groupId is null
 * - 'group': returns only bookmarks belonging to the specified groupId
 */
export type BookmarkGroupFilter =
  | { type: 'all' }
  | { type: 'uncategorized' }
  | { type: 'group'; groupId: string };

/**
 * Normalizes different input formats into a canonical BookmarkGroupFilter.
 */
export function normalizeGroupFilter(
  filter?: BookmarkGroupFilter | string | null | 'all'
): BookmarkGroupFilter {
  if (filter === undefined || filter === 'all' || filter === '') {
    return { type: 'all' };
  }
  if (filter === null) {
    return { type: 'uncategorized' };
  }
  if (typeof filter === 'object' && 'type' in filter) {
    return filter;
  }
  return { type: 'group', groupId: filter };
}

export interface FilterBookmarksOptions {
  searchQuery?: string;
  groupFilter?: BookmarkGroupFilter;
  /**
   * Convenience parameter supporting discriminated union, groupId string,
   * null (uncategorized), or 'all' (all bookmarks).
   */
  activeGroupId?: string | null | 'all' | BookmarkGroupFilter;
  showFavoritesOnly?: boolean;
  sortBy?: BookmarkSortField;
  sortDirection?: SortDirection;
}

/**
 * Extracts a normalized domain hostname from a URL string without network calls.
 * Strips leading 'www.' and returns lowercase domain.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Splits a search query into non-empty, lowercase keywords.
 */
export function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Computes a deterministic relevance score for a bookmark given a search query.
 * Returns -1 if the bookmark does not match all tokens (AND matching).
 */
export function scoreBookmark(
  bookmark: BookmarkEntity,
  rawQuery: string,
  tokens: string[]
): number {
  if (tokens.length === 0) return 0;

  const titleLower = bookmark.title.toLowerCase();
  const rawQueryLower = rawQuery.trim().toLowerCase();
  const urlLower = bookmark.url.toLowerCase();
  const domainLower = extractDomain(bookmark.url);
  const descLower = (bookmark.description || '').toLowerCase();

  // 1. AND matching: Every token must appear in at least one field
  for (const token of tokens) {
    const inTitle = titleLower.includes(token);
    const inDomain = domainLower.includes(token);
    const inUrl = urlLower.includes(token);
    const inDesc = descLower.includes(token);

    if (!inTitle && !inDomain && !inUrl && !inDesc) {
      return -1; // Missing at least one token
    }
  }

  // 2. Compute weighted relevance score
  let score = 0;

  // Exact title match (highest priority)
  if (titleLower === rawQueryLower) {
    score += 1000;
  }
  // Title starts with full query
  else if (titleLower.startsWith(rawQueryLower)) {
    score += 500;
  }
  // Title contains full query
  else if (titleLower.includes(rawQueryLower)) {
    score += 250;
  }

  // Exact domain match
  if (domainLower === rawQueryLower) {
    score += 300;
  }
  // Domain starts with query
  else if (domainLower.startsWith(rawQueryLower)) {
    score += 150;
  }
  // Domain contains query
  else if (domainLower.includes(rawQueryLower)) {
    score += 100;
  }

  // URL contains full query
  if (urlLower.includes(rawQueryLower)) {
    score += 80;
  }

  // Description contains full query
  if (descLower.includes(rawQueryLower)) {
    score += 40;
  }

  // Token-level bonuses
  for (const token of tokens) {
    if (titleLower.includes(token)) score += 30;
    if (domainLower.includes(token)) score += 20;
    if (urlLower.includes(token)) score += 10;
    if (descLower.includes(token)) score += 5;
  }

  return score;
}

/**
 * Pure function that filters and sorts bookmarks based on search query,
 * category group, favorite status, and sort criteria.
 * Does not mutate the input array or entities.
 */
export function filterAndSortBookmarks(
  bookmarks: BookmarkEntity[],
  options: FilterBookmarksOptions = {}
): BookmarkEntity[] {
  const {
    searchQuery = '',
    groupFilter,
    activeGroupId,
    showFavoritesOnly = false,
    sortBy = 'order',
    sortDirection = 'asc',
  } = options;

  const resolvedFilter = normalizeGroupFilter(groupFilter ?? activeGroupId);

  const trimmedQuery = searchQuery.trim();
  const tokens = tokenizeQuery(trimmedQuery);
  const isSearching = tokens.length > 0;

  // 1. Apply static filters (group and favorite)
  const candidates = bookmarks.filter((bm) => {
    // Group filter: 'all' = any, 'uncategorized' = null only, 'group' = matching groupId
    if (resolvedFilter.type === 'uncategorized') {
      if (bm.groupId !== null) return false;
    } else if (resolvedFilter.type === 'group') {
      if (bm.groupId !== resolvedFilter.groupId) return false;
    }

    // Favorites filter
    if (showFavoritesOnly && !bm.isFavorite) {
      return false;
    }

    return true;
  });

  // 2. If searching: rank by score, then tie-breakers
  if (isSearching) {
    const scored: Array<{ bookmark: BookmarkEntity; score: number }> = [];

    for (const bm of candidates) {
      const score = scoreBookmark(bm, trimmedQuery, tokens);
      if (score >= 0) {
        scored.push({ bookmark: bm, score });
      }
    }

    // Sort by score descending; stable tie-breakers: order asc, createdAt asc, id asc
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.bookmark.order !== b.bookmark.order) return a.bookmark.order - b.bookmark.order;
      if (a.bookmark.createdAt !== b.bookmark.createdAt) return a.bookmark.createdAt - b.bookmark.createdAt;
      return a.bookmark.id.localeCompare(b.bookmark.id);
    });

    return scored.map((item) => item.bookmark);
  }

  // 3. If not searching: sort by selected criteria
  const result = [...candidates];
  const multiplier = sortDirection === 'desc' ? -1 : 1;

  result.sort((a, b) => {
    let diff = 0;
    if (sortBy === 'title') {
      diff = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    } else if (sortBy === 'createdAt') {
      diff = a.createdAt - b.createdAt;
    } else if (sortBy === 'updatedAt') {
      diff = a.updatedAt - b.updatedAt;
    } else {
      // Default: 'order'
      diff = a.order - b.order;
    }

    if (diff !== 0) return diff * multiplier;
    // Stable tie-breakers: createdAt, then id
    if (a.createdAt !== b.createdAt) return (a.createdAt - b.createdAt) * multiplier;
    return a.id.localeCompare(b.id);
  });

  return result;
}
