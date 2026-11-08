import { NoteEntity } from '../../../types/notes';

export type NoteSortField = 'order' | 'title' | 'updatedAt' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export type NoteViewFilter =
  | { type: 'all' }
  | { type: 'pinned' }
  | { type: 'favorites' }
  | { type: 'uncategorized' }
  | { type: 'archived' }
  | { type: 'collection'; collectionId: string }
  | { type: 'tag'; tag: string };

export function normalizeNoteViewFilter(
  filter?: NoteViewFilter | string | null | 'all' | 'pinned' | 'favorites' | 'archived'
): NoteViewFilter {
  if (filter === undefined || filter === 'all' || filter === '') {
    return { type: 'all' };
  }
  if (filter === null) {
    return { type: 'uncategorized' };
  }
  if (typeof filter === 'object' && 'type' in filter) {
    return filter;
  }
  if (filter === 'pinned') {
    return { type: 'pinned' };
  }
  if (filter === 'favorites') {
    return { type: 'favorites' };
  }
  if (filter === 'archived') {
    return { type: 'archived' };
  }
  return { type: 'collection', collectionId: filter };
}

export interface FilterNotesOptions {
  searchQuery?: string;
  viewFilter?: NoteViewFilter;
  activeCollectionId?: string | null | 'all' | 'pinned' | 'favorites' | 'archived' | NoteViewFilter;
  selectedTag?: string;
  sortBy?: NoteSortField;
  sortDirection?: SortDirection;
  includeArchived?: boolean;
}

export function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

export function scoreNote(
  note: NoteEntity,
  rawQuery: string,
  tokens: string[]
): number {
  if (tokens.length === 0) return 0;

  const titleLower = note.title.toLowerCase();
  const rawQueryLower = rawQuery.trim().toLowerCase();
  const excerptLower = note.excerpt.toLowerCase();
  const contentLower = note.content.toLowerCase();
  const tagsLower = note.tags.map((t) => t.toLowerCase());

  // 1. AND matching: Every token must appear in at least one field
  for (const token of tokens) {
    const inTitle = titleLower.includes(token);
    const inExcerpt = excerptLower.includes(token);
    const inContent = contentLower.includes(token);
    const inTags = tagsLower.some((t) => t.includes(token));

    if (!inTitle && !inExcerpt && !inContent && !inTags) {
      return -1; // Missing at least one token
    }
  }

  // 2. Compute relevance score
  let score = 0;

  // Title matches
  if (titleLower === rawQueryLower) {
    score += 150;
  } else if (titleLower.startsWith(rawQueryLower)) {
    score += 80;
  } else if (titleLower.includes(rawQueryLower)) {
    score += 50;
  }

  // Token matches in title
  for (const token of tokens) {
    if (titleLower.includes(token)) {
      score += 25;
    }
  }

  // Tag matches
  for (const tag of tagsLower) {
    if (tag === rawQueryLower) {
      score += 60;
    } else if (tokens.some((token) => tag === token)) {
      score += 35;
    } else if (tokens.some((token) => tag.includes(token))) {
      score += 15;
    }
  }

  // Content & excerpt matches
  for (const token of tokens) {
    if (excerptLower.includes(token)) {
      score += 10;
    }
    if (contentLower.includes(token)) {
      score += 5;
    }
  }

  return score;
}

export function filterAndSortNotes(
  notes: NoteEntity[],
  options: FilterNotesOptions = {}
): NoteEntity[] {
  const {
    searchQuery = '',
    selectedTag,
    sortBy = 'updatedAt',
    sortDirection = 'desc',
    includeArchived = false,
  } = options;

  const viewFilter = options.viewFilter ?? normalizeNoteViewFilter(options.activeCollectionId);
  const rawQuery = searchQuery.trim();
  const tokens = tokenizeQuery(rawQuery);

  // 1. Filter by view, tag, archive status, and search query
  const scoredItems: { note: NoteEntity; score: number }[] = [];

  for (const note of notes) {
    // Handle archived status
    if (viewFilter.type !== 'archived' && !includeArchived && note.isArchived) {
      continue;
    }

    // View filter
    switch (viewFilter.type) {
      case 'pinned':
        if (!note.isPinned) continue;
        break;
      case 'favorites':
        if (!note.isFavorite) continue;
        break;
      case 'uncategorized':
        if (note.collectionId !== null) continue;
        break;
      case 'archived':
        if (!note.isArchived) continue;
        break;
      case 'collection':
        if (note.collectionId !== viewFilter.collectionId) continue;
        break;
      case 'tag':
        if (!note.tags.includes(viewFilter.tag.toLowerCase())) continue;
        break;
      case 'all':
      default:
        break;
    }

    // Explicit tag filter if specified
    if (selectedTag && !note.tags.includes(selectedTag.trim().toLowerCase())) {
      continue;
    }

    // Search query scoring
    if (tokens.length > 0) {
      const score = scoreNote(note, rawQuery, tokens);
      if (score < 0) {
        continue; // Exclude non-matching
      }
      scoredItems.push({ note, score });
    } else {
      scoredItems.push({ note, score: 0 });
    }
  }

  // 2. Sort results
  const isSearchActive = tokens.length > 0;

  scoredItems.sort((a, b) => {
    // If searching, higher relevance score comes first
    if (isSearchActive && a.score !== b.score) {
      return b.score - a.score;
    }

    // Pinned notes always sort to the top unless viewing archive
    if (viewFilter.type !== 'archived' && a.note.isPinned !== b.note.isPinned) {
      return a.note.isPinned ? -1 : 1;
    }

    // Sort by requested field
    let comparison = 0;
    switch (sortBy) {
      case 'title':
        comparison = a.note.title.localeCompare(b.note.title);
        break;
      case 'order':
        comparison = a.note.order - b.note.order;
        break;
      case 'createdAt':
        comparison = a.note.createdAt - b.note.createdAt;
        break;
      case 'updatedAt':
      default:
        comparison = a.note.updatedAt - b.note.updatedAt;
        break;
    }

    if (comparison !== 0) {
      return sortDirection === 'desc' ? -comparison : comparison;
    }

    // Tie breaker
    return a.note.id.localeCompare(b.note.id);
  });

  return scoredItems.map((item) => item.note);
}
