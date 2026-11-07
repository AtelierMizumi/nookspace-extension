import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarOverviewWidgetComponent } from '../../../src/widgets/CalendarOverviewWidget';
import { useCalendarTrackerStore } from '../../../src/features/calendar-tracker/calendarTrackerStore';
import { STORAGE_KEY_LAST_DRAINED_AT } from '../../../src/features/pomodoro/storageService';
import { STORAGE_KEY_TODO_LAST_UPDATED_AT } from '../../../src/services/database/repositories/todoRepository';

describe('CalendarOverviewWidgetComponent — Milestone 5.6 UI & Live Sync', () => {
  beforeEach(() => {
    useCalendarTrackerStore.setState({
      viewMode: 'month',
      currentMonth: new Date(2026, 10, 1),
      selectedDateString: null,
      data: null,
      isLoading: false,
      error: null,
      activeWorkspaceId: undefined,
    });
  });

  it('1. Renders loading state when isLoading is true and data is null', () => {
    useCalendarTrackerStore.setState({
      isLoading: true,
      data: null,
      fetchData: vi.fn(),
    });

    render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-cal"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('2. Renders error state with retry button', () => {
    const fetchSpy = vi.fn();
    useCalendarTrackerStore.setState({
      isLoading: false,
      error: 'Simulated Dexie read error',
      data: null,
      fetchData: fetchSpy,
    });

    render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-cal"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Simulated Dexie read error')).toBeInTheDocument();
    const retryBtn = screen.getByText('Try Again');
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('3. Renders Month Glance view with weekday headers and day numbers', () => {
    useCalendarTrackerStore.setState({
      viewMode: 'month',
      currentMonth: new Date(2026, 10, 1),
      selectedDateString: '2026-11-07',
      data: {
        referenceDateString: '2026-11-07',
        targetMonthDate: new Date(2026, 10, 1),
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
              completedTodos: 3,
              completedGoals: 0,
              isActive: true,
              heatmapLevel: 2,
            },
          },
        ],
        heatmapCells: [],
        streaks: {
          currentStreak: 4,
          bestStreak: 7,
          isPendingToday: false,
          activeDateCount: 4,
        },
        dayMap: {
          '2026-11-07': {
            dateString: '2026-11-07',
            focusMinutes: 50,
            completedSessions: 2,
            completedTodos: 3,
            completedGoals: 0,
            isActive: true,
            heatmapLevel: 2,
          },
        },
      },
      fetchData: vi.fn(),
    });

    render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-cal"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Study Calendar')).toBeInTheDocument();
    expect(screen.getByText('Su')).toBeInTheDocument();
    expect(screen.getByText('Mo')).toBeInTheDocument();
    expect(screen.getByText('4d')).toBeInTheDocument(); // Current Streak badge
    expect(screen.getByText('50m')).toBeInTheDocument(); // Focus minutes detail
    expect(screen.getByText('3')).toBeInTheDocument(); // Completed todos detail
  });

  it('4. Toggles between Month Glance and Activity Heatmap views', () => {
    useCalendarTrackerStore.setState({
      viewMode: 'month',
      currentMonth: new Date(2026, 10, 1),
      data: {
        referenceDateString: '2026-11-07',
        targetMonthDate: new Date(2026, 10, 1),
        monthDays: [],
        heatmapCells: [
          {
            dateString: '2026-11-07',
            dayOfWeek: 6,
            focusMinutes: 60,
            heatmapLevel: 3,
            isActive: true,
            isToday: true,
          },
        ],
        streaks: {
          currentStreak: 1,
          bestStreak: 5,
          isPendingToday: false,
          activeDateCount: 1,
        },
        dayMap: {},
      },
      fetchData: vi.fn(),
    });

    render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-cal"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // Click heatmap toggle button
    const heatmapToggle = screen.getByTitle('Activity Heatmap');
    fireEvent.click(heatmapToggle);

    // Heatmap view should display title & legend
    expect(screen.getByText('Recent 7 Weeks Activity')).toBeInTheDocument();
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('5. Clicking a day cell selects the day and updates day detail footer', () => {
    const setSelectedDateSpy = vi.fn();
    useCalendarTrackerStore.setState({
      viewMode: 'month',
      currentMonth: new Date(2026, 10, 1),
      selectedDateString: '2026-11-07',
      setSelectedDate: setSelectedDateSpy,
      data: {
        referenceDateString: '2026-11-07',
        targetMonthDate: new Date(2026, 10, 1),
        monthDays: [
          {
            dateString: '2026-11-05',
            dayNumber: 5,
            isCurrentMonth: true,
            isToday: false,
            activity: {
              dateString: '2026-11-05',
              focusMinutes: 30,
              completedSessions: 1,
              completedTodos: 0,
              completedGoals: 0,
              isActive: true,
              heatmapLevel: 2,
            },
          },
        ],
        heatmapCells: [],
        streaks: {
          currentStreak: 1,
          bestStreak: 1,
          isPendingToday: false,
          activeDateCount: 1,
        },
        dayMap: {
          '2026-11-05': {
            dateString: '2026-11-05',
            focusMinutes: 30,
            completedSessions: 1,
            completedTodos: 0,
            completedGoals: 0,
            isActive: true,
            heatmapLevel: 2,
          },
        },
      },
      fetchData: vi.fn(),
    });

    render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-cal"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const day5Btn = screen.getByText('5');
    fireEvent.click(day5Btn);
    expect(setSelectedDateSpy).toHaveBeenCalledWith('2026-11-05');
  });

  it('6. Live synchronization: Pomodoro signal triggers refresh strictly post-commit', () => {
    const fetchSpy = vi.fn();
    useCalendarTrackerStore.setState({
      fetchData: fetchSpy,
    });

    let storageListener: any = null;
    (globalThis as any).browser = {
      storage: {
        onChanged: {
          addListener: vi.fn((fn) => {
            storageListener = fn;
          }),
          removeListener: vi.fn(),
        },
      },
    };

    render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-cal"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Unrelated storage change
    storageListener({ other_key: { newValue: 'abc' } }, 'local');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Pomodoro last drained at arrives
    storageListener(
      {
        [STORAGE_KEY_LAST_DRAINED_AT]: { newValue: 5000 },
      },
      'local'
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith('ws-1');
  });

  it('7. Live synchronization: Todo signal triggers refresh', () => {
    const fetchSpy = vi.fn();
    useCalendarTrackerStore.setState({
      fetchData: fetchSpy,
    });

    let storageListener: any = null;
    (globalThis as any).browser = {
      storage: {
        onChanged: {
          addListener: vi.fn((fn) => {
            storageListener = fn;
          }),
          removeListener: vi.fn(),
        },
      },
    };

    render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-cal"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Todo update signal arrives
    storageListener(
      {
        [STORAGE_KEY_TODO_LAST_UPDATED_AT]: { newValue: 6000 },
      },
      'local'
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith('ws-1');
  });

  it('8. Cleans up storage listener on unmount', () => {
    const removeListenerSpy = vi.fn();
    (globalThis as any).browser = {
      storage: {
        onChanged: {
          addListener: vi.fn(),
          removeListener: removeListenerSpy,
        },
      },
    };

    const { unmount } = render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-cal"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(removeListenerSpy).not.toHaveBeenCalled();
    unmount();
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
  });
});
