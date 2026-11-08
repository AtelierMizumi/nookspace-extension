import { describe, it, expect } from 'vitest';
import { NoteEntity } from '../../../src/types/notes';
import {
  tokenizeQuery,
  scoreNote,
  filterAndSortNotes,
  normalizeNoteViewFilter,
} from '../../../src/features/notes/services/noteSearchService';

describe('NoteSearchService Suite', () => {
  const baseNote: NoteEntity = {
    id: 'note-1',
    workspaceId: 'ws-1',
    collectionId: null,
    title: 'TypeScript Design Patterns',
    content: 'Comprehensive guide to architectural design patterns in modern TypeScript.',
    excerpt: 'Comprehensive guide to architectural design patterns in modern TypeScript.',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    tags: ['typescript', 'architecture'],
    order: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };

  it('1. tokenizes search query correctly into lowercase tokens', () => {
    expect(tokenizeQuery('  React   TypeScript   HOF  ')).toEqual(['react', 'typescript', 'hof']);
    expect(tokenizeQuery('')).toEqual([]);
  });

  it('2. scores notes based on multi-field match and enforces AND matching', () => {
    // Both tokens exist (TypeScript in title, guide in excerpt)
    const scoreBoth = scoreNote(baseNote, 'typescript guide', ['typescript', 'guide']);
    expect(scoreBoth).toBeGreaterThan(0);

    // One token missing -> returns -1
    const scoreMissing = scoreNote(baseNote, 'typescript python', ['typescript', 'python']);
    expect(scoreMissing).toBe(-1);
  });

  it('3. filters by view: all, pinned, favorites, uncategorized, archived, collection, tag', () => {
    const notes: NoteEntity[] = [
      { ...baseNote, id: 'n1', isPinned: true, title: 'Pinned Note' },
      { ...baseNote, id: 'n2', isFavorite: true, title: 'Favorite Note' },
      { ...baseNote, id: 'n3', collectionId: 'col-1', title: 'In Collection' },
      { ...baseNote, id: 'n4', isArchived: true, title: 'Archived Note' },
      { ...baseNote, id: 'n5', tags: ['frontend'], title: 'Tagged Note' },
    ];

    expect(filterAndSortNotes(notes, { viewFilter: { type: 'pinned' } }).map((n) => n.id)).toEqual(['n1']);
    expect(filterAndSortNotes(notes, { viewFilter: { type: 'favorites' } }).map((n) => n.id)).toEqual(['n2']);
    expect(filterAndSortNotes(notes, { viewFilter: { type: 'uncategorized' } }).map((n) => n.id)).toEqual([
      'n1',
      'n2',
      'n5',
    ]);
    expect(filterAndSortNotes(notes, { viewFilter: { type: 'collection', collectionId: 'col-1' } }).map((n) => n.id)).toEqual(['n3']);
    expect(filterAndSortNotes(notes, { viewFilter: { type: 'archived' } }).map((n) => n.id)).toEqual(['n4']);
    expect(filterAndSortNotes(notes, { viewFilter: { type: 'tag', tag: 'frontend' } }).map((n) => n.id)).toEqual(['n5']);
  });

  it('4. excludes archived notes by default in non-archive views', () => {
    const notes: NoteEntity[] = [
      { ...baseNote, id: 'active', isArchived: false },
      { ...baseNote, id: 'archived', isArchived: true },
    ];

    const result = filterAndSortNotes(notes, { viewFilter: { type: 'all' } });
    expect(result.map((n) => n.id)).toEqual(['active']);
  });

  it('5. ranks exact title matches higher than content-only matches', () => {
    const notes: NoteEntity[] = [
      { ...baseNote, id: 'content-match', title: 'Other Title', content: 'Mentions react here.' },
      { ...baseNote, id: 'exact-match', title: 'React', content: 'Short description.' },
      { ...baseNote, id: 'prefix-match', title: 'React Query Guide', content: 'Libraries.' },
    ];

    const results = filterAndSortNotes(notes, { searchQuery: 'react' });
    expect(results.map((n) => n.id)).toEqual(['exact-match', 'prefix-match', 'content-match']);
  });

  it('6. sorts by different fields and directions', () => {
    const notes: NoteEntity[] = [
      { ...baseNote, id: 'n1', title: 'B', order: 2, updatedAt: 3000 },
      { ...baseNote, id: 'n2', title: 'A', order: 0, updatedAt: 1000 },
      { ...baseNote, id: 'n3', title: 'C', order: 1, updatedAt: 2000 },
    ];

    const byTitleAsc = filterAndSortNotes(notes, { sortBy: 'title', sortDirection: 'asc' });
    expect(byTitleAsc.map((n) => n.title)).toEqual(['A', 'B', 'C']);

    const byOrderAsc = filterAndSortNotes(notes, { sortBy: 'order', sortDirection: 'asc' });
    expect(byOrderAsc.map((n) => n.title)).toEqual(['A', 'C', 'B']);

    const byUpdatedDesc = filterAndSortNotes(notes, { sortBy: 'updatedAt', sortDirection: 'desc' });
    expect(byUpdatedDesc.map((n) => n.title)).toEqual(['B', 'C', 'A']);
  });

  it('7. keeps pinned notes at the top in normal list view', () => {
    const notes: NoteEntity[] = [
      { ...baseNote, id: 'unpinned', isPinned: false, updatedAt: 5000 },
      { ...baseNote, id: 'pinned', isPinned: true, updatedAt: 1000 },
    ];

    const result = filterAndSortNotes(notes, { sortBy: 'updatedAt', sortDirection: 'desc' });
    expect(result.map((n) => n.id)).toEqual(['pinned', 'unpinned']);
  });

  it('8. normalizes view filter helpers correctly', () => {
    expect(normalizeNoteViewFilter('all')).toEqual({ type: 'all' });
    expect(normalizeNoteViewFilter(null)).toEqual({ type: 'uncategorized' });
    expect(normalizeNoteViewFilter('pinned')).toEqual({ type: 'pinned' });
    expect(normalizeNoteViewFilter('favorites')).toEqual({ type: 'favorites' });
    expect(normalizeNoteViewFilter('archived')).toEqual({ type: 'archived' });
    expect(normalizeNoteViewFilter('col-123')).toEqual({ type: 'collection', collectionId: 'col-123' });
  });
});
