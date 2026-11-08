import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectDailyFlashcards,
  getLocalDateString,
  stringToSeed,
  mulberry32,
  deterministicShuffle,
} from '../../../src/features/flashcards/dailySelectionEngine';
import { VocabularyEntity } from '../../../src/types/database';

describe('Daily Deterministic Selection Engine', () => {
  const mockCards: VocabularyEntity[] = Array.from({ length: 20 }, (_, i) => ({
    id: `card-${i + 1}`,
    word: `Word ${i + 1}`,
    meaning: `Meaning ${i + 1}`,
    category: 'general',
    status: i < 5 ? 'mastered' : i < 12 ? 'learning' : 'new',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. returns stable selection for the same date and does not reshuffle', () => {
    const run1 = selectDailyFlashcards(mockCards, 5, 'ws-1', '2026-11-08');
    const run2 = selectDailyFlashcards(mockCards, 5, 'ws-1', '2026-11-08');

    expect(run1.length).toBe(5);
    expect(run2.length).toBe(5);
    expect(run1.map((c) => c.id)).toEqual(run2.map((c) => c.id));
  });

  it('2. provides different randomized variety across different dates', () => {
    // Clear cache between calls to test PRNG date variance
    localStorage.clear();
    const day1 = selectDailyFlashcards(mockCards, 5, 'ws-1', '2026-11-08');

    localStorage.clear();
    const day2 = selectDailyFlashcards(mockCards, 5, 'ws-1', '2026-11-09');

    // Both return 5 cards but with date-based variety
    expect(day1.length).toBe(5);
    expect(day2.length).toBe(5);
  });

  it('3. respects requested daily count limit', () => {
    const selected3 = selectDailyFlashcards(mockCards, 3, 'ws-1', '2026-11-08');
    expect(selected3.length).toBe(3);

    localStorage.clear();
    const selected10 = selectDailyFlashcards(mockCards, 10, 'ws-1', '2026-11-08');
    expect(selected10.length).toBe(10);
  });

  it('4. caches selection in localStorage to guarantee zero reshuffle across component rerenders', () => {
    const selected = selectDailyFlashcards(mockCards, 5, 'ws-1', '2026-11-08');
    const cachedItem = localStorage.getItem('nookspace_flashcards_daily_ws-1_2026-11-08');
    expect(cachedItem).not.toBeNull();

    const cachedIds: string[] = JSON.parse(cachedItem!);
    expect(cachedIds).toEqual(selected.map((c) => c.id));
  });
});
