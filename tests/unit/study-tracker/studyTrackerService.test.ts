import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudyTrackerService } from '../../../src/features/study-tracker/studyTrackerService';
import { FocusSessionEntity } from '../../../src/types/database';

describe('StudyTrackerService — Milestone 5.4 Data Layer', () => {
  let mockRepo: any;
  let service: StudyTrackerService;
  let fakeSessions: FocusSessionEntity[] = [];

  beforeEach(() => {
    fakeSessions = [];
    mockRepo = {
      getByDateRange: vi.fn(async (_wsId, start, end) => {
        return fakeSessions.filter((s) => s.startedAt >= start && s.startedAt <= end);
      }),
    };
    service = new StudyTrackerService(mockRepo);
  });

  it('1. Returns zero stats and non-empty activity history when no sessions exist', async () => {
    const stats = await service.getStudyStats(undefined, '7D', new Date(2026, 10, 7));

    expect(stats.totalFocusMinutes).toBe(0);
    expect(stats.completedSessions).toBe(0);
    expect(stats.averageSessionMinutes).toBe(0);
    expect(stats.activityHistory.length).toBe(7);
    // Every day must have 0, not empty or missing
    expect(stats.activityHistory.every((d) => d.focusMinutes === 0)).toBe(true);
  });

  it('2. Filters completed focus sessions and ignores breaks and uncompleted sessions', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0); // Nov 7, 2026
    const now = refDate.getTime();

    fakeSessions.push(
      // Valid completed Focus (25m)
      {
        id: 's1',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - 3600 * 1000,
        completedAt: now - 2100 * 1000,
        completed: true,
      },
      // Valid completed Study (45m)
      {
        id: 's2',
        type: 'study',
        durationMinutes: 45,
        startedAt: now - 7200 * 1000,
        completedAt: now - 4500 * 1000,
        completed: true,
      },
      // Short break (MUST BE EXCLUDED)
      {
        id: 'sb1',
        type: 'short_break',
        durationMinutes: 5,
        startedAt: now - 2100 * 1000,
        completedAt: now - 1800 * 1000,
        completed: true,
      },
      // Long break (MUST BE EXCLUDED)
      {
        id: 'lb1',
        type: 'long_break',
        durationMinutes: 15,
        startedAt: now - 1800 * 1000,
        completedAt: now - 900 * 1000,
        completed: true,
      },
      // Incomplete session (e.g. Cancelled)
      {
        id: 's3',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - 8000 * 1000,
        completedAt: now - 7500 * 1000,
        completed: false,
      }
    );

    const stats = await service.getStudyStats(undefined, '7D', refDate);

    // Only s1 (25m) + s2 (45m) = 70m
    expect(stats.totalFocusMinutes).toBe(70);
    expect(stats.completedSessions).toBe(2);
    expect(stats.averageSessionMinutes).toBe(35); // 70 / 2
    expect(stats.todayFocusMinutes).toBe(70);
    expect(stats.todayCompletedSessions).toBe(2);
  });

  it('3. Groups multiple sessions on different days correctly', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0); // Nov 7
    const oneDayMs = 24 * 3600 * 1000;

    // Session on Nov 5 (2 days ago)
    fakeSessions.push({
      id: 'prev-1',
      type: 'pomodoro',
      durationMinutes: 50,
      startedAt: refDate.getTime() - 2 * oneDayMs,
      completedAt: refDate.getTime() - 2 * oneDayMs + 3000 * 1000,
      completed: true,
    });

    // Session on Nov 7 (Today)
    fakeSessions.push({
      id: 'today-1',
      type: 'pomodoro',
      durationMinutes: 25,
      startedAt: refDate.getTime() - 100000,
      completedAt: refDate.getTime(),
      completed: true,
    });

    const stats = await service.getStudyStats(undefined, '7D', refDate);

    expect(stats.totalFocusMinutes).toBe(75);
    expect(stats.completedSessions).toBe(2);

    const todayPoint = stats.activityHistory.find((p) => p.dateString === '2026-11-07');
    expect(todayPoint?.focusMinutes).toBe(25);
    expect(todayPoint?.completedSessions).toBe(1);

    const prevPoint = stats.activityHistory.find((p) => p.dateString === '2026-11-05');
    expect(prevPoint?.focusMinutes).toBe(50);
    expect(prevPoint?.completedSessions).toBe(1);
  });

  it('4. Supports 14D (14 days) and 30D (30 days) ranges', async () => {
    const refDate = new Date(2026, 10, 7);
    const stats14D = await service.getStudyStats(undefined, '14D', refDate);
    expect(stats14D.activityHistory.length).toBe(14);

    const stats30D = await service.getStudyStats(undefined, '30D', refDate);
    expect(stats30D.activityHistory.length).toBe(30);
  });
});
