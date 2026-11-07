import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCalendarTrackerStore } from '../../../src/features/calendar-tracker/calendarTrackerStore';

describe('useCalendarTrackerStore — Milestone 5.6 UI State Architecture', () => {
  let mockService: any;
  let store: ReturnType<typeof createCalendarTrackerStore>;

  beforeEach(() => {
    mockService = {
      toLocalDateString: vi.fn((d: Date) => '2026-11-07'),
      getCalendarTrackerData: vi.fn(async (wsId?: string, month?: Date) => ({
        referenceDateString: '2026-11-07',
        targetMonthDate: month || new Date(),
        monthDays: [
          {
            dateString: '2026-11-07',
            dayNumber: 7,
            isCurrentMonth: true,
            isToday: true,
            activity: {
              dateString: '2026-11-07',
              focusMinutes: 50,
              completedSessions: 2,
              completedTodos: 1,
              completedGoals: 0,
              isActive: true,
              heatmapLevel: 2,
            },
          },
        ],
        heatmapCells: [],
        streaks: {
          currentStreak: 3,
          bestStreak: 5,
          isPendingToday: false,
          activeDateCount: 3,
        },
        dayMap: {
          '2026-11-07': {
            dateString: '2026-11-07',
            focusMinutes: 50,
            completedSessions: 2,
            completedTodos: 1,
            completedGoals: 0,
            isActive: true,
            heatmapLevel: 2,
          },
        },
      })),
    };

    store = createCalendarTrackerStore(mockService);
  });

  it('1. Fetches calendar tracker data and populates store state', async () => {
    await store.getState().fetchData('ws-1');

    const state = store.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.data?.streaks.currentStreak).toBe(3);
    expect(state.data?.streaks.bestStreak).toBe(5);
    expect(state.selectedDateString).toBe('2026-11-07');
    expect(mockService.getCalendarTrackerData).toHaveBeenCalledWith('ws-1', expect.any(Date));
  });

  it('2. Records error gracefully on service failure', async () => {
    mockService.getCalendarTrackerData.mockRejectedValueOnce(new Error('IndexedDB QuotaExceeded'));

    await store.getState().fetchData('ws-1');

    const state = store.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('IndexedDB QuotaExceeded');
  });

  it('3. Navigation: nextMonth, prevMonth, and goToToday update currentMonth and re-fetch', async () => {
    const initialMonth = new Date(2026, 10, 1); // Nov 2026
    store.setState({ currentMonth: initialMonth });

    store.getState().nextMonth();
    expect(store.getState().currentMonth.getMonth()).toBe(11); // Dec 2026

    store.getState().prevMonth();
    expect(store.getState().currentMonth.getMonth()).toBe(10); // Nov 2026

    store.getState().goToToday();
    const today = new Date();
    expect(store.getState().currentMonth.getMonth()).toBe(today.getMonth());
  });

  it('4. Toggles view mode between month and heatmap', () => {
    expect(store.getState().viewMode).toBe('month');
    store.getState().setViewMode('heatmap');
    expect(store.getState().viewMode).toBe('heatmap');
    store.getState().setViewMode('month');
    expect(store.getState().viewMode).toBe('month');
  });

  it('5. Race condition defense: stale async responses from earlier workspace switches do not overwrite current state', async () => {
    let resolveFirst: any;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    mockService.getCalendarTrackerData.mockImplementationOnce(async () => {
      await firstPromise;
      return {
        referenceDateString: '2026-11-07',
        targetMonthDate: new Date(),
        monthDays: [],
        heatmapCells: [],
        streaks: { currentStreak: 1, bestStreak: 1, isPendingToday: false, activeDateCount: 1 },
        dayMap: {},
      };
    });

    // Start slow fetch for ws-1
    const p1 = store.getState().fetchData('ws-1');

    // Immediately start fast fetch for ws-2
    mockService.getCalendarTrackerData.mockResolvedValueOnce({
      referenceDateString: '2026-11-07',
      targetMonthDate: new Date(),
      monthDays: [],
      heatmapCells: [],
      streaks: { currentStreak: 10, bestStreak: 20, isPendingToday: false, activeDateCount: 15 },
      dayMap: {},
    });
    const p2 = store.getState().fetchData('ws-2');

    await p2;
    expect(store.getState().data?.streaks.currentStreak).toBe(10);

    // Resolve first slow request
    resolveFirst();
    await p1;

    // Stale response must be discarded!
    expect(store.getState().data?.streaks.currentStreak).toBe(10);
    expect(store.getState().data?.streaks.bestStreak).toBe(20);
  });
});
