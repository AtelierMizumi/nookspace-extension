import { describe, it, expect } from 'vitest';
import {
  toDayOrdinal,
  fromDayOrdinal,
  isValidDateString,
  getHeatmapLevel,
  calculateStreaks,
} from '../../../src/features/calendar-tracker/streakCalculator';

describe('Streak Calculator — Milestone 5.6 Pure Algorithm', () => {
  it('1. Returns zero streaks when there are no active dates', () => {
    const res = calculateStreaks([], '2026-11-07');
    expect(res.currentStreak).toBe(0);
    expect(res.bestStreak).toBe(0);
    expect(res.isPendingToday).toBe(false);
    expect(res.activeDateCount).toBe(0);
  });

  it('2. Hôm nay active, hôm qua active: continues streak', () => {
    const active = ['2026-11-06', '2026-11-07'];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(2);
    expect(res.bestStreak).toBe(2);
    expect(res.isPendingToday).toBe(false);
  });

  it('3. Hôm nay active, hôm qua inactive: starts 1-day streak', () => {
    const active = ['2026-11-04', '2026-11-07'];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(1);
    expect(res.bestStreak).toBe(1);
    expect(res.isPendingToday).toBe(false);
  });

  it('4. Hôm nay inactive, hôm qua active: retains streak with pending_today', () => {
    const active = ['2026-11-05', '2026-11-06'];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(2);
    expect(res.bestStreak).toBe(2);
    expect(res.isPendingToday).toBe(true);
  });

  it('5. Hôm nay inactive, hôm qua inactive: streak is 0', () => {
    const active = ['2026-11-01', '2026-11-02', '2026-11-05'];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(0);
    expect(res.bestStreak).toBe(2); // 2026-11-01 & 02
    expect(res.isPendingToday).toBe(false);
  });

  it('6. Calculates continuous 5-day streak correctly', () => {
    const active = [
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(5);
    expect(res.bestStreak).toBe(5);
    expect(res.isPendingToday).toBe(false);
    expect(res.activeDateCount).toBe(5);
  });

  it('7. Calculates best streak across historical gaps', () => {
    const active = [
      // Run 1: 3 days
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      // Gap
      // Run 2: 7 days (Best Streak)
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      // Gap
      // Current Run: 2 days
      '2026-11-06',
      '2026-11-07',
    ];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(2);
    expect(res.bestStreak).toBe(7);
    expect(res.activeDateCount).toBe(12);
  });

  it('8. Multiple runs with identical maximum length yield deterministic best streak', () => {
    const active = [
      '2026-10-01',
      '2026-10-02',
      '2026-10-03', // 3 days
      '2026-10-10',
      '2026-10-11',
      '2026-10-12', // 3 days
      '2026-11-07', // 1 day
    ];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(1);
    expect(res.bestStreak).toBe(3);
  });

  it('9. Discards invalid date strings safely without crashing', () => {
    const active = ['not-a-date', '2026-02-31', '2026-11-07', ''];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(1);
    expect(res.activeDateCount).toBe(1);
  });

  it('10. Ignores future dates beyond reference date', () => {
    const active = ['2026-11-07', '2026-11-08', '2026-11-09'];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(1);
    expect(res.activeDateCount).toBe(1);
  });

  it('11. DST immunity: consecutive days across DST transition have exact day ordinal difference of 1', () => {
    // US DST transition in Nov: 2026-11-01
    const ordPrev = toDayOrdinal('2026-11-01');
    const ordNext = toDayOrdinal('2026-11-02');
    expect(ordNext - ordPrev).toBe(1);
    expect(fromDayOrdinal(ordPrev)).toBe('2026-11-01');
    expect(fromDayOrdinal(ordNext)).toBe('2026-11-02');
  });

  it('12. Multiple activities on the same day are deduplicated to a single active day', () => {
    const active = ['2026-11-07', '2026-11-07', '2026-11-07'];
    const res = calculateStreaks(active, '2026-11-07');
    expect(res.currentStreak).toBe(1);
    expect(res.activeDateCount).toBe(1);
  });

  it('13. getHeatmapLevel maps focus minutes accurately to Levels 0 through 4', () => {
    expect(getHeatmapLevel(0)).toBe(0);
    expect(getHeatmapLevel(-10)).toBe(0);
    expect(getHeatmapLevel(1)).toBe(1);
    expect(getHeatmapLevel(29)).toBe(1);
    expect(getHeatmapLevel(30)).toBe(2);
    expect(getHeatmapLevel(59)).toBe(2);
    expect(getHeatmapLevel(60)).toBe(3);
    expect(getHeatmapLevel(119)).toBe(3);
    expect(getHeatmapLevel(120)).toBe(4);
    expect(getHeatmapLevel(240)).toBe(4);
  });
});
