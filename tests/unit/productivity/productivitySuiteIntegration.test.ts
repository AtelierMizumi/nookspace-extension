import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/services/database/db';
import { todoRepo, STORAGE_KEY_TODO_LAST_UPDATED_AT } from '@/services/database/repositories/todoRepository';
import { FocusSessionRepository } from '@/services/database/repositories/focusSessionRepository';
import { dailyGoalRepository } from '@/services/database/repositories/dailyGoalRepository';
import { studyTrackerService } from '@/features/study-tracker/studyTrackerService';
import { dailyGoalsService } from '@/features/daily-goals/dailyGoalsService';
import { calendarTrackerService } from '@/features/calendar-tracker/calendarTrackerService';
import { outboxService } from '@/features/pomodoro/outboxService';
import { storageService, STORAGE_KEY_LAST_DRAINED_AT, DEFAULT_ENVELOPE } from '@/features/pomodoro/storageService';
import { createMockBrowser } from '../../mocks/browser';
import { browserApi } from '@/services/browser';
import { OutboxSessionEntry } from '@/types/pomodoro';

describe('Productivity Suite Cross-Module Integration — Milestone 5.7', () => {
  const focusRepo = new FocusSessionRepository(db);

  let mockBrowser: ReturnType<typeof createMockBrowser>;

  beforeEach(async () => {
    mockBrowser = createMockBrowser();
    (globalThis as any).browser = mockBrowser.mock;
    (globalThis as any).chrome = mockBrowser.mock;

    await db.open();
    await db.todos.clear();
    await db.focusSessions.clear();
    await db.dailyGoals.clear();

    // Reset storage envelope
    await storageService.saveEnvelope({
      ...DEFAULT_ENVELOPE,
      pendingOutbox: [],
    });

    vi.clearAllMocks();
  });

  // Helper for today local string
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  describe('Scenario 1 — Pomodoro to Study Tracker', () => {
    it('persists completed focus session through outbox and updates study tracker metrics', async () => {
      const now = Date.now();
      const entry: OutboxSessionEntry = {
        sessionId: 'session-pom-1',
        workspaceId: 'ws-integ',
        type: 'focus',
        durationMinutes: 25,
        startedAt: now - 25 * 60 * 1000,
        completedAt: now,
        retryCount: 0,
        nextRetryAt: now,
        firstAttemptAt: now,
      };

      // 1. Enqueue in outbox envelope
      await storageService.saveEnvelope({
        ...DEFAULT_ENVELOPE,
        pendingOutbox: [entry],
      });

      // 2. Outbox drains into Dexie
      const drainResult = await outboxService.drainPendingOutbox();
      expect(drainResult.drainedCount).toBe(1);

      // 3. Verify FocusSession is in Dexie
      const sessionInDb = await focusRepo.getById('session-pom-1');
      expect(sessionInDb).toBeDefined();
      expect(sessionInDb?.type).toBe('pomodoro');
      expect(sessionInDb?.completed).toBe(true);

      // 4. Study Tracker reflects increased total duration & count
      const stats = await studyTrackerService.getStudyStats('ws-integ', '7D');
      expect(stats.totalFocusMinutes).toBe(25);
      expect(stats.completedSessions).toBe(1);
      expect(stats.averageSessionMinutes).toBe(25);

      // 5. Verify break sessions do NOT increase study stats
      const breakEntry: OutboxSessionEntry = {
        sessionId: 'session-break-1',
        workspaceId: 'ws-integ',
        type: 'shortBreak',
        durationMinutes: 5,
        startedAt: now - 5 * 60 * 1000,
        completedAt: now,
        retryCount: 0,
        nextRetryAt: now,
        firstAttemptAt: now,
      };
      await storageService.saveEnvelope({
        ...DEFAULT_ENVELOPE,
        pendingOutbox: [breakEntry],
      });
      await outboxService.drainPendingOutbox();

      const statsAfterBreak = await studyTrackerService.getStudyStats('ws-integ', '7D');
      expect(statsAfterBreak.totalFocusMinutes).toBe(25); // Unchanged
      expect(statsAfterBreak.completedSessions).toBe(1); // Unchanged
    });
  });

  describe('Scenario 2 — Pomodoro to Daily Goals', () => {
    it('updates focus time and focus sessions goals upon Pomodoro completion, surviving reload', async () => {
      // 1. Initial goals summary (creates default targets: 120m focus, 4 sessions)
      const initialSummary = await dailyGoalsService.getDailyGoalsSummary('ws-integ');
      expect(initialSummary.goals).toHaveLength(3);
      const focusTimeGoal = initialSummary.goals.find((g) => g.type === 'focus_time');
      const focusSessionsGoal = initialSummary.goals.find((g) => g.type === 'focus_sessions');
      expect(focusTimeGoal?.currentValue).toBe(0);
      expect(focusSessionsGoal?.currentValue).toBe(0);

      // 2. Complete a 50m Focus Session via outbox
      const now = Date.now();
      const entry: OutboxSessionEntry = {
        sessionId: 'session-pom-2',
        workspaceId: 'ws-integ',
        type: 'focus',
        durationMinutes: 50,
        startedAt: now - 50 * 60 * 1000,
        completedAt: now,
        retryCount: 0,
        nextRetryAt: now,
        firstAttemptAt: now,
      };
      await storageService.saveEnvelope({
        ...DEFAULT_ENVELOPE,
        pendingOutbox: [entry],
      });
      await outboxService.drainPendingOutbox();

      // 3. Daily Goals recalculated
      const updatedSummary = await dailyGoalsService.getDailyGoalsSummary('ws-integ');
      const updatedFocusTime = updatedSummary.goals.find((g) => g.type === 'focus_time');
      const updatedFocusSessions = updatedSummary.goals.find((g) => g.type === 'focus_sessions');

      expect(updatedFocusTime?.currentValue).toBe(50);
      expect(updatedFocusTime?.percentage).toBe(Math.round((50 / 120) * 100));
      expect(updatedFocusSessions?.currentValue).toBe(1);

      // 4. Reload dashboard (new service call simulating cold mount)
      const freshService = new (dailyGoalsService.constructor as any)();
      const reloadedSummary = await freshService.getDailyGoalsSummary('ws-integ');
      expect(reloadedSummary.goals.find((g: any) => g.type === 'focus_time')?.currentValue).toBe(50);
      expect(reloadedSummary.goals.find((g: any) => g.type === 'focus_sessions')?.currentValue).toBe(1);
    });
  });

  describe('Scenario 3 — Todo to Daily Goals', () => {
    it('reflects task completion and reopening accurately in completed_todos goal', async () => {
      // 1. Initial goals
      await dailyGoalsService.getDailyGoalsSummary('ws-integ');

      // 2. Create uncompleted todo
      const task = await todoRepo.create({
        workspaceId: 'ws-integ',
        title: 'Integration Test Task',
        priority: 'high',
        completed: false,
      });

      let summary = await dailyGoalsService.getDailyGoalsSummary('ws-integ');
      let todoGoal = summary.goals.find((g) => g.type === 'completed_todos');
      expect(todoGoal?.currentValue).toBe(0);

      // 3. Complete task -> progress increases to 1
      await todoRepo.setCompleted(task.id, true, 'ws-integ');
      summary = await dailyGoalsService.getDailyGoalsSummary('ws-integ');
      todoGoal = summary.goals.find((g) => g.type === 'completed_todos');
      expect(todoGoal?.currentValue).toBe(1);

      // 4. Reopen task -> progress decreases back to 0
      await todoRepo.setCompleted(task.id, false, 'ws-integ');
      summary = await dailyGoalsService.getDailyGoalsSummary('ws-integ');
      todoGoal = summary.goals.find((g) => g.type === 'completed_todos');
      expect(todoGoal?.currentValue).toBe(0);

      // 5. Reload dashboard -> persisted state verified
      const reloaded = await dailyGoalsService.getDailyGoalsSummary('ws-integ');
      expect(reloaded.goals.find((g) => g.type === 'completed_todos')?.currentValue).toBe(0);
    });
  });

  describe('Scenario 4 — Todo to Calendar & Streak', () => {
    it('activates calendar day on task completion and reverts upon task reopening', async () => {
      const todayStr = getTodayStr();

      // 1. Initially day is inactive
      let calData = await calendarTrackerService.getCalendarTrackerData('ws-integ');
      expect(calData.dayMap[todayStr]?.isActive).toBeFalsy();

      // 2. Complete a task today
      const task = await todoRepo.create({
        workspaceId: 'ws-integ',
        title: 'Streak Starter Task',
        priority: 'medium',
        completed: true,
        completedAt: Date.now(),
      });

      // 3. Calendar recognizes active study day
      calData = await calendarTrackerService.getCalendarTrackerData('ws-integ');
      expect(calData.dayMap[todayStr]?.isActive).toBe(true);
      expect(calData.dayMap[todayStr]?.completedTodos).toBe(1);
      expect(calData.streaks.currentStreak).toBe(1);

      // 4. Reopen the task
      await todoRepo.setCompleted(task.id, false, 'ws-integ');

      // 5. Calendar day reverts to inactive if no other activity exists
      calData = await calendarTrackerService.getCalendarTrackerData('ws-integ');
      const dayAct = calData.dayMap[todayStr];
      expect(dayAct === undefined || dayAct.isActive === false).toBe(true);
      expect(calData.streaks.currentStreak).toBe(0);
    });
  });

  describe('Scenario 5 — Combined Daily Activity', () => {
    it('aggregates focus, todos, and daily goals correctly with focus-only heatmap', async () => {
      const now = Date.now();
      const todayStr = getTodayStr();

      // 1. Completed Focus Session (45m)
      await focusRepo.create({
        id: 'sess-combined-1',
        workspaceId: 'ws-integ',
        type: 'pomodoro',
        durationMinutes: 45,
        startedAt: now - 45 * 60 * 1000,
        completedAt: now,
        completed: true,
      });

      // 2. Completed Todo
      await todoRepo.create({
        workspaceId: 'ws-integ',
        title: 'Daily Todo Item',
        completed: true,
        completedAt: now,
      });

      // 3. Reached Daily Goal (custom goal)
      await dailyGoalRepository.saveGoal({
        id: `dg_ws-integ_${todayStr}_custom`,
        workspaceId: 'ws-integ',
        title: 'Read Documentation',
        targetValue: 1,
        currentValue: 1,
        dateString: todayStr,
        createdAt: now,
        updatedAt: now,
      });

      // 4. Query Calendar Tracker
      const calData = await calendarTrackerService.getCalendarTrackerData('ws-integ');
      const todayActivity = calData.dayMap[todayStr];

      expect(todayActivity).toBeDefined();
      expect(todayActivity.isActive).toBe(true);
      expect(todayActivity.focusMinutes).toBe(45);
      expect(todayActivity.completedSessions).toBe(1);
      expect(todayActivity.completedTodos).toBe(1);
      expect(todayActivity.completedGoals).toBe(1);

      // Level 2: 30 - 59 mins (focus minutes only, not inflated by todo or goal)
      expect(todayActivity.heatmapLevel).toBe(2);

      const cell = calData.heatmapCells.find((c) => c.dateString === todayStr);
      expect(cell?.heatmapLevel).toBe(2);
      expect(cell?.focusMinutes).toBe(45);
    });
  });

  describe('Scenario 6 — Workspace Isolation', () => {
    it('enforces total data separation across workspaces A and B', async () => {
      const now = Date.now();

      // Workspace A: 2 todos, 25m focus
      await todoRepo.create({ workspaceId: 'ws-A', title: 'Task A1', completed: true, completedAt: now });
      await todoRepo.create({ workspaceId: 'ws-A', title: 'Task A2', completed: true, completedAt: now });
      await focusRepo.create({
        id: 'sess-A',
        workspaceId: 'ws-A',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - 25 * 60 * 1000,
        completedAt: now,
        completed: true,
      });

      // Workspace B: 1 todo, 60m focus
      await todoRepo.create({ workspaceId: 'ws-B', title: 'Task B1', completed: true, completedAt: now });
      await focusRepo.create({
        id: 'sess-B',
        workspaceId: 'ws-B',
        type: 'pomodoro',
        durationMinutes: 60,
        startedAt: now - 60 * 60 * 1000,
        completedAt: now,
        completed: true,
      });

      // Study Tracker Isolation
      const statsA = await studyTrackerService.getStudyStats('ws-A', '7D');
      const statsB = await studyTrackerService.getStudyStats('ws-B', '7D');
      expect(statsA.totalFocusMinutes).toBe(25);
      expect(statsA.completedSessions).toBe(1);
      expect(statsB.totalFocusMinutes).toBe(60);
      expect(statsB.completedSessions).toBe(1);

      // Daily Goals Isolation
      const goalsA = await dailyGoalsService.getDailyGoalsSummary('ws-A');
      const goalsB = await dailyGoalsService.getDailyGoalsSummary('ws-B');
      expect(goalsA.goals.find((g) => g.type === 'focus_time')?.currentValue).toBe(25);
      expect(goalsA.goals.find((g) => g.type === 'completed_todos')?.currentValue).toBe(2);
      expect(goalsB.goals.find((g) => g.type === 'focus_time')?.currentValue).toBe(60);
      expect(goalsB.goals.find((g) => g.type === 'completed_todos')?.currentValue).toBe(1);

      // Calendar Tracker Isolation
      const calA = await calendarTrackerService.getCalendarTrackerData('ws-A');
      const calB = await calendarTrackerService.getCalendarTrackerData('ws-B');
      const todayStr = getTodayStr();
      expect(calA.dayMap[todayStr]?.focusMinutes).toBe(25);
      expect(calA.dayMap[todayStr]?.completedTodos).toBe(2);
      expect(calB.dayMap[todayStr]?.focusMinutes).toBe(60);
      expect(calB.dayMap[todayStr]?.completedTodos).toBe(1);
    });
  });

  describe('Scenario 7 — Reload & Recovery', () => {
    it('recovers pending outbox on restart and prevents duplicate session entries', async () => {
      const now = Date.now();
      const entry: OutboxSessionEntry = {
        sessionId: 'session-crash-recovery',
        workspaceId: 'ws-integ',
        type: 'focus',
        durationMinutes: 30,
        startedAt: now - 30 * 60 * 1000,
        completedAt: now,
        retryCount: 0,
        nextRetryAt: now,
        firstAttemptAt: now,
      };

      // Envelope has pending outbox
      await storageService.saveEnvelope({
        ...DEFAULT_ENVELOPE,
        pendingOutbox: [entry],
      });

      // 1. Initial Drain (simulating browser startup recovery)
      const result1 = await outboxService.drainPendingOutbox();
      expect(result1.drainedCount).toBe(1);

      // Verify envelope pendingOutbox cleared
      const envelopeAfter = await storageService.loadEnvelope();
      expect(envelopeAfter.pendingOutbox).toHaveLength(0);

      // 2. Second drain with same entry (idempotency check)
      const persistCheck = await outboxService.persistEntryToDexie(entry);
      expect(persistCheck).toBe('already_exists');

      // Verify only 1 session exists in Dexie
      const allSessions = await focusRepo.getByWorkspace('ws-integ');
      expect(allSessions).toHaveLength(1);
      expect(allSessions[0].id).toBe('session-crash-recovery');
    });
  });

  describe('Scenario 8 — Multi-tab Synchronization Signals', () => {
    it('dispatches correct storage keys upon Todo and Pomodoro completion for other tabs', async () => {
      const storageSetSpy = vi.spyOn(browserApi.storage.local, 'set');

      // 1. Todo completion emits STORAGE_KEY_TODO_LAST_UPDATED_AT
      await todoRepo.create({
        workspaceId: 'ws-tab',
        title: 'Cross-tab Task',
        completed: false,
      });

      expect(storageSetSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          [STORAGE_KEY_TODO_LAST_UPDATED_AT]: expect.any(Number),
        })
      );

      // 2. Pomodoro drain emits STORAGE_KEY_LAST_DRAINED_AT
      storageSetSpy.mockClear();
      const now = Date.now();
      await storageService.saveEnvelope({
        ...DEFAULT_ENVELOPE,
        pendingOutbox: [
          {
            sessionId: 'sess-tab-1',
            workspaceId: 'ws-tab',
            type: 'focus',
            durationMinutes: 25,
            startedAt: now - 25 * 60 * 1000,
            completedAt: now,
            retryCount: 0,
            nextRetryAt: now,
            firstAttemptAt: now,
          },
        ],
      });

      await outboxService.drainPendingOutbox();
      expect(storageSetSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          [STORAGE_KEY_LAST_DRAINED_AT]: expect.any(Number),
        })
      );

      storageSetSpy.mockRestore();
    });
  });
});
