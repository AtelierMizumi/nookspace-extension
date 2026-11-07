import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyGoalsService } from '../../../src/features/daily-goals/dailyGoalsService';
import { DailyGoalEntity, FocusSessionEntity, TodoEntity } from '../../../src/types/database';

describe('DailyGoalsService — Milestone 5.5 Business Logic', () => {
  let fakeGoals: Map<string, DailyGoalEntity>;
  let fakeSessions: FocusSessionEntity[];
  let fakeTodos: TodoEntity[];

  let mockGoalRepo: any;
  let mockFocusRepo: any;
  let mockTodoRepo: any;
  let service: DailyGoalsService;

  beforeEach(() => {
    fakeGoals = new Map();
    fakeSessions = [];
    fakeTodos = [];

    mockGoalRepo = {
      getById: vi.fn(async (id: string) => fakeGoals.get(id)),
      getGoalsForDate: vi.fn(async (dateString: string, wsId?: string) => {
        const all = Array.from(fakeGoals.values()).filter((g) => g.dateString === dateString);
        return wsId ? all.filter((g) => g.workspaceId === wsId) : all.filter((g) => !g.workspaceId);
      }),
      saveGoal: vi.fn(async (g: DailyGoalEntity) => {
        fakeGoals.set(g.id, g);
        return g;
      }),
      bulkSaveGoals: vi.fn(async (goals: DailyGoalEntity[]) => {
        for (const g of goals) {
          fakeGoals.set(g.id, g);
        }
      }),
      clearGoalsForDate: vi.fn(async (dateString: string, wsId?: string) => {
        for (const [id, g] of fakeGoals.entries()) {
          const matchDate = g.dateString === dateString;
          const matchWs = wsId ? g.workspaceId === wsId : !g.workspaceId;
          if (matchDate && matchWs) {
            fakeGoals.delete(id);
          }
        }
      }),
    };

    mockFocusRepo = {
      getByDateRange: vi.fn(async (_wsId, start, end) => {
        return fakeSessions.filter((s) => s.startedAt >= start && s.startedAt <= end);
      }),
    };

    mockTodoRepo = {
      getByWorkspace: vi.fn(async (wsId?: string) => {
        return wsId ? fakeTodos.filter((t) => t.workspaceId === wsId) : fakeTodos;
      }),
    };

    service = new DailyGoalsService(mockGoalRepo, mockFocusRepo, mockTodoRepo);
  });

  it('1. Initializes default 3 goals when no goals exist for today', async () => {
    const refDate = new Date(2026, 10, 7, 10, 0, 0); // 2026-11-07
    const summary = await service.getDailyGoalsSummary('ws-1', refDate);

    expect(summary.dateString).toBe('2026-11-07');
    expect(summary.goals.length).toBe(3);

    const focusTimeGoal = summary.goals.find((g) => g.type === 'focus_time');
    expect(focusTimeGoal).toBeDefined();
    expect(focusTimeGoal?.targetValue).toBe(120);
    expect(focusTimeGoal?.unit).toBe('mins');
    expect(focusTimeGoal?.currentValue).toBe(0);

    const sessionsGoal = summary.goals.find((g) => g.type === 'focus_sessions');
    expect(sessionsGoal?.targetValue).toBe(4);
    expect(sessionsGoal?.currentValue).toBe(0);

    const todosGoal = summary.goals.find((g) => g.type === 'completed_todos');
    expect(todosGoal?.targetValue).toBe(3);
    expect(todosGoal?.currentValue).toBe(0);

    expect(summary.overallPercentage).toBe(0);
    expect(summary.allCompleted).toBe(false);
  });

  it('2. Calculates progress from single completed focus session', async () => {
    const refDate = new Date(2026, 10, 7, 14, 0, 0);
    const now = refDate.getTime();

    fakeSessions.push({
      id: 'fs-1',
      type: 'pomodoro',
      durationMinutes: 25,
      startedAt: now - 30 * 60 * 1000,
      completedAt: now - 5 * 60 * 1000,
      completed: true,
      workspaceId: 'ws-1',
    });

    const summary = await service.getDailyGoalsSummary('ws-1', refDate);

    const timeGoal = summary.goals.find((g) => g.type === 'focus_time');
    expect(timeGoal?.currentValue).toBe(25);
    expect(timeGoal?.percentage).toBe(Math.round((25 / 120) * 100)); // 21%
    expect(timeGoal?.isCompleted).toBe(false);

    const sessionsGoal = summary.goals.find((g) => g.type === 'focus_sessions');
    expect(sessionsGoal?.currentValue).toBe(1);
    expect(sessionsGoal?.percentage).toBe(25); // 1 / 4 = 25%
  });

  it('3. Excludes breaks and uncompleted/cancelled sessions from progress', async () => {
    const refDate = new Date(2026, 10, 7, 14, 0, 0);
    const now = refDate.getTime();

    fakeSessions.push(
      // Valid Pomodoro
      {
        id: 'fs-valid',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - 3600 * 1000,
        completedAt: now - 2100 * 1000,
        completed: true,
        workspaceId: 'ws-1',
      },
      // Short break (MUST BE EXCLUDED)
      {
        id: 'fs-short-break',
        type: 'short_break',
        durationMinutes: 5,
        startedAt: now - 2000 * 1000,
        completedAt: now - 1700 * 1000,
        completed: true,
        workspaceId: 'ws-1',
      },
      // Long break (MUST BE EXCLUDED)
      {
        id: 'fs-long-break',
        type: 'long_break',
        durationMinutes: 15,
        startedAt: now - 1600 * 1000,
        completedAt: now - 700 * 1000,
        completed: true,
        workspaceId: 'ws-1',
      },
      // Incomplete/cancelled session (MUST BE EXCLUDED)
      {
        id: 'fs-cancelled',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - 600 * 1000,
        completedAt: now - 100 * 1000,
        completed: false,
        workspaceId: 'ws-1',
      }
    );

    const summary = await service.getDailyGoalsSummary('ws-1', refDate);

    const timeGoal = summary.goals.find((g) => g.type === 'focus_time');
    expect(timeGoal?.currentValue).toBe(25); // Only fs-valid

    const sessionsGoal = summary.goals.find((g) => g.type === 'focus_sessions');
    expect(sessionsGoal?.currentValue).toBe(1);
  });

  it('4. Handles sessions on different dates and midnight boundaries', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0); // Nov 7
    const dayStart = new Date(2026, 10, 7, 0, 1, 0).getTime(); // Nov 7 00:01
    const dayEnd = new Date(2026, 10, 7, 23, 59, 0).getTime(); // Nov 7 23:59
    const prevDay = new Date(2026, 10, 6, 23, 58, 0).getTime(); // Nov 6 23:58

    fakeSessions.push(
      // Previous day (excluded)
      {
        id: 'fs-yesterday',
        type: 'pomodoro',
        durationMinutes: 50,
        startedAt: prevDay,
        completedAt: prevDay + 3000 * 1000,
        completed: true,
        workspaceId: 'ws-1',
      },
      // Just after midnight (included)
      {
        id: 'fs-midnight',
        type: 'study',
        durationMinutes: 30,
        startedAt: dayStart,
        completedAt: dayStart + 1800 * 1000,
        completed: true,
        workspaceId: 'ws-1',
      },
      // Just before midnight (included)
      {
        id: 'fs-night',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: dayEnd,
        completedAt: dayEnd + 1500 * 1000,
        completed: true,
        workspaceId: 'ws-1',
      }
    );

    const summary = await service.getDailyGoalsSummary('ws-1', refDate);

    const timeGoal = summary.goals.find((g) => g.type === 'focus_time');
    // 30m + 25m = 55m
    expect(timeGoal?.currentValue).toBe(55);
    const sessionsGoal = summary.goals.find((g) => g.type === 'focus_sessions');
    expect(sessionsGoal?.currentValue).toBe(2);
  });

  it('5. Correctly calculates goal completion and caps percentage at 100% when exceeding target', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const now = refDate.getTime();

    // 6 pomodoro sessions of 25m = 150 mins total (Target: 120 mins, 4 sessions)
    for (let i = 0; i < 6; i++) {
      fakeSessions.push({
        id: `fs-exceed-${i}`,
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - (i + 1) * 3600 * 1000,
        completedAt: now - i * 3600 * 1000,
        completed: true,
        workspaceId: 'ws-1',
      });
    }

    // 4 completed tasks (Target: 3 tasks)
    for (let i = 0; i < 4; i++) {
      fakeTodos.push({
        id: `todo-${i}`,
        title: `Task ${i}`,
        completed: true,
        completedAt: now - 1000,
        priority: 'medium',
        order: i,
        workspaceId: 'ws-1',
        createdAt: now - 3600 * 1000,
        updatedAt: now - 1000,
      });
    }

    const summary = await service.getDailyGoalsSummary('ws-1', refDate);

    const timeGoal = summary.goals.find((g) => g.type === 'focus_time');
    expect(timeGoal?.currentValue).toBe(150);
    expect(timeGoal?.targetValue).toBe(120);
    expect(timeGoal?.percentage).toBe(100); // Capped at 100%
    expect(timeGoal?.isCompleted).toBe(true);

    const sessionsGoal = summary.goals.find((g) => g.type === 'focus_sessions');
    expect(sessionsGoal?.currentValue).toBe(6);
    expect(sessionsGoal?.targetValue).toBe(4);
    expect(sessionsGoal?.percentage).toBe(100);
    expect(sessionsGoal?.isCompleted).toBe(true);

    const todosGoal = summary.goals.find((g) => g.type === 'completed_todos');
    expect(todosGoal?.currentValue).toBe(4);
    expect(todosGoal?.targetValue).toBe(3);
    expect(todosGoal?.percentage).toBe(100);
    expect(todosGoal?.isCompleted).toBe(true);

    expect(summary.allCompleted).toBe(true);
    expect(summary.completedCount).toBe(3);
    expect(summary.overallPercentage).toBe(100);
  });

  it('6. Updates goal target with validation', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const initial = await service.getDailyGoalsSummary('ws-1', refDate);
    const focusTimeGoal = initial.goals.find((g) => g.type === 'focus_time')!;

    // Valid update
    const updated = await service.updateGoalTarget(focusTimeGoal.id, 90, 'ws-1', refDate);
    const updatedGoal = updated.goals.find((g) => g.id === focusTimeGoal.id);
    expect(updatedGoal?.targetValue).toBe(90);

    // Invalid target (0 or negative) rejects
    await expect(service.updateGoalTarget(focusTimeGoal.id, 0, 'ws-1', refDate)).rejects.toThrow();
    await expect(service.updateGoalTarget(focusTimeGoal.id, -5, 'ws-1', refDate)).rejects.toThrow();
  });

  it('7. Resets goals to default targets', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0);
    const initial = await service.getDailyGoalsSummary('ws-1', refDate);
    const focusTimeGoal = initial.goals.find((g) => g.type === 'focus_time')!;

    await service.updateGoalTarget(focusTimeGoal.id, 200, 'ws-1', refDate);
    const modified = await service.getDailyGoalsSummary('ws-1', refDate);
    expect(modified.goals.find((g) => g.id === focusTimeGoal.id)?.targetValue).toBe(200);

    // Reset
    const reset = await service.resetGoalsToDefaults('ws-1', refDate);
    expect(reset.goals.find((g) => g.id === focusTimeGoal.id)?.targetValue).toBe(120);
  });

  it('8. Issue A: Todo completion date correctness and midnight boundary verification', async () => {
    const refDate = new Date(2026, 10, 7, 12, 0, 0); // 2026-11-07 12:00:00 local time
    const todayNoon = refDate.getTime();

    const yesterday = new Date(2026, 10, 6, 15, 0, 0).getTime();
    const todayDue = new Date(2026, 10, 7, 18, 0, 0).getTime();
    const nextWeekDue = new Date(2026, 10, 14, 12, 0, 0).getTime();

    const midnightTodayStart = new Date(2026, 10, 7, 0, 0, 1).getTime(); // 00:00:01
    const midnightTodayEnd = new Date(2026, 10, 7, 23, 59, 59).getTime(); // 23:59:59
    const midnightYesterdayEnd = new Date(2026, 10, 6, 23, 59, 59).getTime(); // Yesterday 23:59:59
    const midnightTomorrowStart = new Date(2026, 10, 8, 0, 0, 1).getTime(); // Tomorrow 00:00:01

    fakeTodos.push(
      // 1. Task completed today (MUST BE COUNTED)
      {
        id: 't-today-1',
        title: 'Task completed today',
        completed: true,
        completedAt: todayNoon,
        priority: 'high',
        order: 0,
        workspaceId: 'ws-1',
        createdAt: todayNoon - 10000,
        updatedAt: todayNoon,
      },
      // 2. Task completed yesterday but due today (MUST NOT BE COUNTED - dueDate is deadline, not completion date)
      {
        id: 't-yesterday-due-today',
        title: 'Task completed yesterday but due today',
        completed: true,
        completedAt: yesterday,
        dueDate: todayDue,
        priority: 'medium',
        order: 1,
        workspaceId: 'ws-1',
        createdAt: yesterday - 10000,
        updatedAt: yesterday,
      },
      // 3. Task completed today but due on another day (MUST BE COUNTED - completed today)
      {
        id: 't-today-due-next-week',
        title: 'Task completed today but due next week',
        completed: true,
        completedAt: todayNoon - 1000,
        dueDate: nextWeekDue,
        priority: 'low',
        order: 2,
        workspaceId: 'ws-1',
        createdAt: yesterday,
        updatedAt: todayNoon - 1000,
      },
      // 4. Incomplete task due today (MUST NOT BE COUNTED)
      {
        id: 't-incomplete-due-today',
        title: 'Incomplete task due today',
        completed: false,
        dueDate: todayDue,
        priority: 'urgent',
        order: 3,
        workspaceId: 'ws-1',
        createdAt: yesterday,
        updatedAt: yesterday,
      },
      // 5. Task completed today from ANOTHER workspace (MUST NOT BE COUNTED - workspace isolation)
      {
        id: 't-other-ws',
        title: 'Task in other workspace',
        completed: true,
        completedAt: todayNoon,
        priority: 'medium',
        order: 4,
        workspaceId: 'ws-other',
        createdAt: todayNoon - 1000,
        updatedAt: todayNoon,
      },
      // 6. Midnight boundary: completed at 00:00:01 today (MUST BE COUNTED)
      {
        id: 't-midnight-start',
        title: 'Task at 00:00:01',
        completed: true,
        completedAt: midnightTodayStart,
        priority: 'medium',
        order: 5,
        workspaceId: 'ws-1',
        createdAt: midnightTodayStart,
        updatedAt: midnightTodayStart,
      },
      // 7. Midnight boundary: completed at 23:59:59 today (MUST BE COUNTED)
      {
        id: 't-midnight-end',
        title: 'Task at 23:59:59',
        completed: true,
        completedAt: midnightTodayEnd,
        priority: 'medium',
        order: 6,
        workspaceId: 'ws-1',
        createdAt: midnightTodayEnd,
        updatedAt: midnightTodayEnd,
      },
      // 8. Midnight boundary: completed at 23:59:59 yesterday (MUST NOT BE COUNTED)
      {
        id: 't-midnight-yesterday',
        title: 'Task yesterday night',
        completed: true,
        completedAt: midnightYesterdayEnd,
        priority: 'medium',
        order: 7,
        workspaceId: 'ws-1',
        createdAt: midnightYesterdayEnd,
        updatedAt: midnightYesterdayEnd,
      },
      // 9. Midnight boundary: completed at 00:00:01 tomorrow (MUST NOT BE COUNTED)
      {
        id: 't-midnight-tomorrow',
        title: 'Task tomorrow early',
        completed: true,
        completedAt: midnightTomorrowStart,
        priority: 'medium',
        order: 8,
        workspaceId: 'ws-1',
        createdAt: midnightTomorrowStart,
        updatedAt: midnightTomorrowStart,
      }
    );

    const summary = await service.getDailyGoalsSummary('ws-1', refDate);
    const todoGoal = summary.goals.find((g) => g.type === 'completed_todos');

    // Expected counted tasks:
    // - t-today-1 (counted)
    // - t-today-due-next-week (counted)
    // - t-midnight-start (counted)
    // - t-midnight-end (counted)
    // Total = 4 tasks!
    expect(todoGoal?.currentValue).toBe(4);
  });
});
