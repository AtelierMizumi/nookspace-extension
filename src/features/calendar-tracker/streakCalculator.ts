import { HeatmapLevel, StreakInfo, StreakPolicy } from '../../types/calendarTracker';

/**
 * Validates whether a string matches a real YYYY-MM-DD calendar date.
 */
export function isValidDateString(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const [year, month, day] = dateString.split('-').map(Number);
  if (year < 1970 || year > 3000) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * Converts a YYYY-MM-DD calendar date string into an integer day ordinal
 * using UTC date-only arithmetic.
 * Immune to DST shifts (23/25 hour days).
 */
export function toDayOrdinal(dateString: string): number {
  if (!isValidDateString(dateString)) {
    throw new Error(`Invalid date string for ordinal conversion: "${dateString}"`);
  }
  const [year, month, day] = dateString.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * Converts an integer day ordinal back into a YYYY-MM-DD date string.
 */
export function fromDayOrdinal(ordinal: number): string {
  const d = new Date(ordinal * 86_400_000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Derives Heatmap activity level strictly from Focus Minutes.
 * - Level 0: 0 mins
 * - Level 1: 1 - 29 mins
 * - Level 2: 30 - 59 mins
 * - Level 3: 60 - 119 mins
 * - Level 4: >= 120 mins
 */
export function getHeatmapLevel(focusMinutes: number): HeatmapLevel {
  if (focusMinutes <= 0) return 0;
  if (focusMinutes < 30) return 1;
  if (focusMinutes < 60) return 2;
  if (focusMinutes < 120) return 3;
  return 4;
}

export const StrictDailyPolicy: StreakPolicy = {
  isConsecutive(prevOrdinal: number, currentOrdinal: number): boolean {
    return currentOrdinal === prevOrdinal + 1;
  },
};

/**
 * Pure calculation engine for Current Streak, Best Streak, and Pending Today status.
 */
export function calculateStreaks(
  activeDates: Set<string> | string[],
  referenceDateString: string,
  policy: StreakPolicy = StrictDailyPolicy
): StreakInfo {
  if (!isValidDateString(referenceDateString)) {
    throw new Error(`Invalid reference date string: "${referenceDateString}"`);
  }

  const refOrdinal = toDayOrdinal(referenceDateString);

  // Convert all valid active dates to distinct ordinals, discarding future and invalid dates
  const ordinalSet = new Set<number>();
  for (const dateStr of activeDates) {
    if (isValidDateString(dateStr)) {
      const ord = toDayOrdinal(dateStr);
      if (ord <= refOrdinal) {
        ordinalSet.add(ord);
      }
    }
  }

  if (ordinalSet.size === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      isPendingToday: false,
      activeDateCount: 0,
    };
  }

  // 1. Current Streak calculation
  let currentStreak = 0;
  let isPendingToday = false;

  if (ordinalSet.has(refOrdinal)) {
    // Today is active: count consecutive days backwards from today
    currentStreak = 1;
    let check = refOrdinal - 1;
    while (ordinalSet.has(check)) {
      currentStreak++;
      check--;
    }
    isPendingToday = false;
  } else if (ordinalSet.has(refOrdinal - 1)) {
    // Today is not yet active, but yesterday was active:
    // Retain streak up to yesterday in pending_today status
    currentStreak = 1;
    let check = refOrdinal - 2;
    while (ordinalSet.has(check)) {
      currentStreak++;
      check--;
    }
    isPendingToday = true;
  } else {
    // Neither today nor yesterday was active
    currentStreak = 0;
    isPendingToday = false;
  }

  // 2. Best Streak calculation across all history
  const sorted = Array.from(ordinalSet).sort((a, b) => a - b);
  let bestStreak = 1;
  let runLength = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (policy.isConsecutive(sorted[i - 1], sorted[i])) {
      runLength++;
      if (runLength > bestStreak) {
        bestStreak = runLength;
      }
    } else {
      runLength = 1;
    }
  }

  // Guarantee bestStreak is never less than currentStreak
  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return {
    currentStreak,
    bestStreak,
    isPendingToday,
    activeDateCount: ordinalSet.size,
  };
}
