import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarTrackerService } from '../../../src/features/calendar-tracker/calendarTrackerService';
import { FocusSessionEntity, TodoEntity, DailyGoalEntity } from '../../../src/types/database';

describe('CalendarTrackerService — Milestone 5.6 Data Layer', () => {
  let fakeSessions: FocusSessionEntity[];
  let fakeTodos: TodoEntity[];
  let fakeGoals: DailyGoalEntity[];

  let mockFocusRepo: any;
  let mockTodoRepo: any;
  let mockGoalRepo: any;
  let service: CalendarTrackerService;

  beforeEach(() => {
    fakeSessions = [];
    fakeTodos = [];
    fakeGoals = [];

    mockFocusRepo = {
      getByWorkspace: vi.fn(async (wsId?: string) => {
        return wsId ? fakeSessions.filter((s) => s.workspaceId === wsId) : fakeSessions;
      }),
    };

    mockTodoRepo = {
      getByWorkspace: vi.fn(async (wsId?: string, opts?: any) => {
        let items = wsId ? fakeTodos.filter((t) => t.workspaceId === wsId) : fakeTodos;
        if (opts?.completed !== undefined) {
          items = items.filter((t) => t.completed === opts.completed);
        }
        return items;
      }),
    };

    mockGoalRepo = {
      database: {
        dailyGoals: {
          where: (field: string) => ({
            equals: (val: any) => ({
              toArray: async () => fakeGoals.filter((g) => (g as any)[field] === val),
            }),
          }),
          toCollection: () => ({
            filter: (fn: (g: DailyGoalEntity) => boolean) => ({
              toArray: async () => fakeGoals.filter(fn),
            }),
          }),
        },
      },
    };

    service = new CalendarTrackerService(mockFocusRepo, mockTodoRepo, mockGoalRepo);
  });

  it('1. Valid Focus Session contributes to focus minutes, completed sessions and marks day active', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0); // 2026-11-07
    const now = refDate.getTime();

    fakeSessions.push({
      id: 'fs-valid',
      type: 'pomodoro',
      durationMinutes: 45,
      startedAt: now - 3600 * 1000,
      completedAt: now,
      completed: true,
      workspaceId: 'ws-1',
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    const day = data.dayMap['2026-11-07'];

    expect(day).toBeDefined();
    expect(day.focusMinutes).toBe(45);
    expect(day.completedSessions).toBe(1);
    expect(day.isActive).toBe(true);
    expect(day.heatmapLevel).toBe(2); // 30-59 mins = Level 2
    expect(data.streaks.currentStreak).toBe(1);
  });

  it('2. Breaks (short_break, long_break) are strictly excluded', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const now = refDate.getTime();

    fakeSessions.push(
      {
        id: 'fs-sb',
        type: 'short_break',
        durationMinutes: 5,
        startedAt: now - 2000,
        completedAt: now,
        completed: true,
        workspaceId: 'ws-1',
      },
      {
        id: 'fs-lb',
        type: 'long_break',
        durationMinutes: 15,
        startedAt: now - 1000,
        completedAt: now,
        completed: true,
        workspaceId: 'ws-1',
      }
    );

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    const day = data.dayMap['2026-11-07'];

    expect(day).toBeUndefined();
    expect(data.streaks.currentStreak).toBe(0);
  });

  it('3. Cancelled/skipped/incomplete sessions are strictly excluded', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const now = refDate.getTime();

    fakeSessions.push({
      id: 'fs-cancelled',
      type: 'pomodoro',
      durationMinutes: 25,
      startedAt: now - 1000,
      completedAt: now,
      completed: false, // Incomplete / cancelled
      workspaceId: 'ws-1',
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    expect(data.dayMap['2026-11-07']).toBeUndefined();
    expect(data.streaks.currentStreak).toBe(0);
  });

  it('4. Completed Todo with completedAt marks day active', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const now = refDate.getTime();

    fakeTodos.push({
      id: 't-1',
      title: 'Finish Milestone 5.6',
      completed: true,
      completedAt: now,
      priority: 'high',
      order: 0,
      workspaceId: 'ws-1',
      createdAt: now - 10000,
      updatedAt: now,
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    const day = data.dayMap['2026-11-07'];

    expect(day).toBeDefined();
    expect(day.completedTodos).toBe(1);
    expect(day.isActive).toBe(true);
    expect(day.focusMinutes).toBe(0);
    expect(day.heatmapLevel).toBe(0); // 0 focus minutes = Level 0
    expect(data.streaks.currentStreak).toBe(1);
  });

  it('5. Completed Todo lacking completedAt is NOT counted toward active study day', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const now = refDate.getTime();

    fakeTodos.push({
      id: 't-no-time',
      title: 'Legacy completed todo',
      completed: true,
      // completedAt is undefined
      priority: 'low',
      order: 0,
      workspaceId: 'ws-1',
      createdAt: now,
      updatedAt: now,
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    expect(data.dayMap['2026-11-07']).toBeUndefined();
    expect(data.streaks.currentStreak).toBe(0);
  });

  it('6. Todo with dueDate today but completed on another day does NOT count for today', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const todayMs = refDate.getTime();
    const yesterdayMs = new Date(2026, 10, 6, 15, 0, 0).getTime();

    fakeTodos.push({
      id: 't-due-today-done-yesterday',
      title: 'Early task',
      completed: true,
      completedAt: yesterdayMs,
      dueDate: todayMs,
      priority: 'medium',
      order: 0,
      workspaceId: 'ws-1',
      createdAt: yesterdayMs,
      updatedAt: yesterdayMs,
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    expect(data.dayMap['2026-11-07']).toBeUndefined();
    expect(data.dayMap['2026-11-06']?.completedTodos).toBe(1);
  });

  it('7. Completed Daily Goal marks day active', async () => {
    const refDate = new Date(2026, 10, 7);

    fakeGoals.push({
      id: 'dg-1',
      workspaceId: 'ws-1',
      title: 'Read 20 pages',
      targetValue: 20,
      currentValue: 20, // Met target
      unit: 'pages',
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    const day = data.dayMap['2026-11-07'];

    expect(day?.isActive).toBe(true);
    expect(day?.completedGoals).toBe(1);
  });

  it('8. Incomplete Daily Goal does not mark day active', async () => {
    const refDate = new Date(2026, 10, 7);

    fakeGoals.push({
      id: 'dg-incomplete',
      workspaceId: 'ws-1',
      title: 'Write 1000 words',
      targetValue: 1000,
      currentValue: 400, // Incomplete
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    expect(data.dayMap['2026-11-07']).toBeUndefined();
  });

  it('9. Todo-only day has 0 Focus Minutes but is correctly recognized as an Active Study Day', async () => {
    const refDate = new Date(2026, 10, 7, 10, 0, 0);

    fakeTodos.push({
      id: 't-only',
      title: 'Coding task',
      completed: true,
      completedAt: refDate.getTime(),
      priority: 'urgent',
      order: 0,
      workspaceId: 'ws-1',
      createdAt: refDate.getTime(),
      updatedAt: refDate.getTime(),
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    const day = data.dayMap['2026-11-07'];

    expect(day.isActive).toBe(true);
    expect(day.focusMinutes).toBe(0);
    expect(day.heatmapLevel).toBe(0);
    expect(data.streaks.currentStreak).toBe(1);
  });

  it('10. Multiple activities on the same day deduplicate to 1 active study day without duplicating streaks', async () => {
    const refDate = new Date(2026, 10, 7, 10, 0, 0);
    const now = refDate.getTime();

    // 2 focus sessions
    fakeSessions.push(
      {
        id: 'fs-1',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - 3600 * 1000,
        completedAt: now - 2100 * 1000,
        completed: true,
        workspaceId: 'ws-1',
      },
      {
        id: 'fs-2',
        type: 'study',
        durationMinutes: 50,
        startedAt: now - 2000 * 1000,
        completedAt: now,
        completed: true,
        workspaceId: 'ws-1',
      }
    );

    // 2 todos
    fakeTodos.push(
      {
        id: 't-1',
        title: 'Task A',
        completed: true,
        completedAt: now,
        priority: 'low',
        order: 0,
        workspaceId: 'ws-1',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 't-2',
        title: 'Task B',
        completed: true,
        completedAt: now,
        priority: 'high',
        order: 1,
        workspaceId: 'ws-1',
        createdAt: now,
        updatedAt: now,
      }
    );

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    const day = data.dayMap['2026-11-07'];

    expect(day.focusMinutes).toBe(75);
    expect(day.completedSessions).toBe(2);
    expect(day.completedTodos).toBe(2);
    expect(day.heatmapLevel).toBe(3); // 60-119 mins = Level 3
    expect(data.streaks.currentStreak).toBe(1);
    expect(data.streaks.activeDateCount).toBe(1);
  });

  it('11. Enforces workspace isolation: activities belonging to other workspaces are excluded', async () => {
    const refDate = new Date(2026, 10, 7, 10, 0, 0);
    const now = refDate.getTime();

    fakeSessions.push({
      id: 'fs-other',
      type: 'pomodoro',
      durationMinutes: 50,
      startedAt: now - 1000,
      completedAt: now,
      completed: true,
      workspaceId: 'ws-other',
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    expect(data.dayMap['2026-11-07']).toBeUndefined();
    expect(data.streaks.currentStreak).toBe(0);
  });

  it('12. Generates calendar month grid starting from Sunday alignment', async () => {
    // Nov 2026 starts on Sunday (Nov 1, 2026 is Sunday)
    const nov2026 = new Date(2026, 10, 1);
    const data = await service.getCalendarTrackerData('ws-1', nov2026, nov2026);

    // First cell must be day 1 (0 leading blanks because Nov 1 is Sunday)
    expect(data.monthDays[0].dayNumber).toBe(1);
    expect(data.monthDays[0].dateString).toBe('2026-11-01');
    expect(data.monthDays[29].dayNumber).toBe(30);
  });

  it('13. Month starting on another day (e.g. Dec 2026 starts on Tuesday) prepends 2 blank days', async () => {
    // Dec 1, 2026 is Tuesday (dayOfWeek = 2, so 2 leading blanks: Sun, Mon)
    const dec2026 = new Date(2026, 11, 1);
    const data = await service.getCalendarTrackerData('ws-1', dec2026, dec2026);

    expect(data.monthDays[0].dayNumber).toBeNull();
    expect(data.monthDays[1].dayNumber).toBeNull();
    expect(data.monthDays[2].dayNumber).toBe(1);
    expect(data.monthDays[2].dateString).toBe('2026-12-01');
  });

  it('14. Respects local midnight boundaries across calendar days', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const nightTime = new Date(2026, 10, 7, 23, 59, 58).getTime();
    const nextDayMorning = new Date(2026, 10, 8, 0, 0, 2).getTime();

    fakeSessions.push(
      {
        id: 'fs-night',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: nightTime - 1500 * 1000,
        completedAt: nightTime,
        completed: true,
        workspaceId: 'ws-1',
      },
      {
        id: 'fs-morning',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: nextDayMorning - 1500 * 1000,
        completedAt: nextDayMorning,
        completed: true,
        workspaceId: 'ws-1',
      }
    );

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    expect(data.dayMap['2026-11-07']?.focusMinutes).toBe(25);
    expect(data.dayMap['2026-11-08']?.focusMinutes).toBe(25);
  });

  it('15. Focus minutes map accurately to Heatmap intensity thresholds', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const now = refDate.getTime();

    // 150 minutes focus
    fakeSessions.push({
      id: 'fs-intense',
      type: 'study',
      durationMinutes: 150,
      startedAt: now - 3600 * 1000,
      completedAt: now,
      completed: true,
      workspaceId: 'ws-1',
    });

    const data = await service.getCalendarTrackerData('ws-1', refDate, refDate);
    expect(data.dayMap['2026-11-07']?.heatmapLevel).toBe(4); // >= 120 mins = Level 4
  });
});
