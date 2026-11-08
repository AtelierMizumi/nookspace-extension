import { VocabularyEntity } from '../../types/database';

/**
 * Returns today's local date string formatted as YYYY-MM-DD.
 */
export function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a deterministic 32-bit hash seed from a string.
 */
export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffles an array deterministically given a PRNG.
 */
export function deterministicShuffle<T>(array: T[], prng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects a stable set of vocabulary cards for the current day.
 * Uses localStorage cache to guarantee that re-renders during the same day never reshuffle.
 */
export function selectDailyFlashcards(
  allCards: VocabularyEntity[],
  dailyCount: number,
  workspaceId?: string,
  dateString?: string
): VocabularyEntity[] {
  if (!allCards || allCards.length === 0) return [];
  const effectiveDate = dateString || getLocalDateString();
  const targetCount = Math.max(1, Math.min(dailyCount || 5, allCards.length));

  const cacheKey = `nookspace_flashcards_daily_${workspaceId || 'default'}_${effectiveDate}`;

  // 1. Check local cache first for today's session
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedIds: string[] = JSON.parse(cached);
        const cardMap = new Map(allCards.map((c) => [c.id, c]));
        const resolved = cachedIds
          .map((id) => cardMap.get(id))
          .filter((c): c is VocabularyEntity => Boolean(c));

        if (resolved.length >= targetCount) {
          return resolved.slice(0, targetCount);
        }
      }
    } catch {
      // Safe fallback to deterministic generator
    }
  }

  // 2. Deterministic selection strategy:
  // Sort cards so 'learning' and 'new' come first, followed by 'mastered'
  const unmastered = allCards.filter((c) => c.status !== 'mastered');
  const mastered = allCards.filter((c) => c.status === 'mastered');

  const seed = stringToSeed(`${effectiveDate}::${workspaceId || ''}::${allCards.length}`);
  const prng = mulberry32(seed);

  const shuffledUnmastered = deterministicShuffle(unmastered, prng);
  const shuffledMastered = deterministicShuffle(mastered, prng);

  const combined = [...shuffledUnmastered, ...shuffledMastered];
  const selected = combined.slice(0, targetCount);

  // 3. Save to localStorage cache for today
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(selected.map((c) => c.id)));
    } catch {
      // Ignore quota errors
    }
  }

  return selected;
}
