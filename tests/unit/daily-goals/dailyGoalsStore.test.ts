import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDailyGoalsStore } from '../../../src/features/daily-goals/dailyGoalsStore';

describe('useDailyGoalsStore — Milestone 5.5 UI State Architecture', () => {
  let mockService: any;
  let store: ReturnType<typeof createDailyGoalsStore>;

  beforeEach(() => {
    mockService = {
      getDailyGoalsSummary: vi.fn(async (wsId?: string) => ({
        dateString: '2026-11-07',
        goals: [
          {
            id: `dg_${wsId || 'global'}_2026-11-07_focus_time`,
            title: 'Daily Focus Time',
            targetValue: 120,
            currentValue: 60,
            unit: 'mins',
            dateString: '2026-11-07',
            type: 'focus_time',
            percentage: 50,
            isCompleted: false,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        overallPercentage: 50,
        allCompleted: false,
        completedCount: 0,
        totalCount: 1,
      })),
      updateGoalTarget: vi.fn(async (_id, target) => ({
        dateString: '2026-11-07',
        goals: [],
        overallPercentage: 100,
        allCompleted: true,
        completedCount: 1,
        totalCount: 1,
      })),
      resetGoalsToDefaults: vi.fn(async () => ({
        dateString: '2026-11-07',
        goals: [],
        overallPercentage: 0,
        allCompleted: false,
        completedCount: 0,
        totalCount: 1,
      })),
    };

    store = createDailyGoalsStore(mockService);
  });

  it('1. Fetches goals and populates summary state', async () => {
    await store.getState().fetchGoals('ws-1');

    const state = store.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.summary?.overallPercentage).toBe(50);
    expect(state.summary?.goals.length).toBe(1);
    expect(mockService.getDailyGoalsSummary).toHaveBeenCalledWith('ws-1');
  });

  it('2. Records error gracefully on service failure', async () => {
    mockService.getDailyGoalsSummary.mockRejectedValueOnce(new Error('IndexedDB QuotaExceeded'));

    await store.getState().fetchGoals('ws-1');

    const state = store.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('IndexedDB QuotaExceeded');
  });

  it('3. Race condition defense: stale async responses from earlier workspace do not overwrite newer fetch', async () => {
    let resolveFirst: any;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    mockService.getDailyGoalsSummary.mockImplementationOnce(async () => {
      await firstPromise;
      return {
        dateString: '2026-11-07',
        goals: [{ id: 'from-first-ws', title: 'Slow WS' }],
        overallPercentage: 10,
      };
    });

    // Start fetch for ws-1 (slow)
    const p1 = store.getState().fetchGoals('ws-1');

    // Immediately fetch for ws-2 (fast)
    mockService.getDailyGoalsSummary.mockResolvedValueOnce({
      dateString: '2026-11-07',
      goals: [{ id: 'from-second-ws', title: 'Fast WS' }],
      overallPercentage: 90,
    });
    const p2 = store.getState().fetchGoals('ws-2');

    await p2;
    expect(store.getState().summary?.goals[0].id).toBe('from-second-ws');

    // Now resolve slow request from ws-1
    resolveFirst();
    await p1;

    // Must still be from second ws! Stale response ignored!
    expect(store.getState().summary?.goals[0].id).toBe('from-second-ws');
    expect(store.getState().summary?.overallPercentage).toBe(90);
  });
});
