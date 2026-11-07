import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudyTrackerWidgetComponent } from '../../../src/widgets/StudyTrackerWidget';
import { useStudyTrackerStore } from '../../../src/features/study-tracker/studyTrackerStore';
import { STORAGE_KEY_LAST_DRAINED_AT, STORAGE_KEY_ENVELOPE } from '../../../src/features/pomodoro/storageService';

describe('StudyTrackerWidgetComponent — Milestone 5.4 UI', () => {
  beforeEach(() => {
    useStudyTrackerStore.setState({
      stats: null,
      timeRange: '7D',
      isLoading: false,
      error: null,
    });
  });

  it('1. Renders empty state when there are no completed sessions', () => {
    useStudyTrackerStore.setState({
      stats: {
        totalFocusMinutes: 0,
        completedSessions: 0,
        averageSessionMinutes: 0,
        activityHistory: [],
        todayFocusMinutes: 0,
        todayCompletedSessions: 0,
      },
    });

    render(
      <StudyTrackerWidgetComponent
        instanceId="inst-st"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Study Tracker')).toBeInTheDocument();
    expect(screen.getByText('No Study Activity Yet')).toBeInTheDocument();
  });

  it('2. Renders metrics and activity bars when stats exist', () => {
    useStudyTrackerStore.setState({
      stats: {
        totalFocusMinutes: 75,
        completedSessions: 3,
        averageSessionMinutes: 25,
        activityHistory: [
          { dateString: '2026-11-01', dayLabel: 'Sun', focusMinutes: 25, completedSessions: 1 },
          { dateString: '2026-11-02', dayLabel: 'Mon', focusMinutes: 50, completedSessions: 2 },
          { dateString: '2026-11-03', dayLabel: 'Tue', focusMinutes: 0, completedSessions: 0 },
        ],
        todayFocusMinutes: 50,
        todayCompletedSessions: 2,
      },
    });

    render(
      <StudyTrackerWidgetComponent
        instanceId="inst-st"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('1h 15m')).toBeInTheDocument(); // 75m
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 sessions
    expect(screen.getByText('25m')).toBeInTheDocument(); // avg 25m
    expect(screen.getByText('Activity Trend')).toBeInTheDocument();
  });

  it('3. Renders time range switcher buttons (7D, 14D, 30D)', () => {
    render(
      <StudyTrackerWidgetComponent
        instanceId="inst-st"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('14D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
  });

  it('4. Renders error state with retry button', () => {
    useStudyTrackerStore.setState({
      stats: null,
      timeRange: '7D',
      isLoading: false,
      error: 'Simulated Dexie read error',
      fetchStats: vi.fn(), // mock fetchStats so mount doesn't reset error
    });

    render(
      <StudyTrackerWidgetComponent
        instanceId="inst-st"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Simulated Dexie read error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('5. Live sync: re-fetches stats ONLY when STORAGE_KEY_LAST_DRAINED_AT changes (Dexie drain completed)', () => {
    const fetchStatsSpy = vi.fn();
    useStudyTrackerStore.setState({
      fetchStats: fetchStatsSpy,
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
      <StudyTrackerWidgetComponent
        instanceId="inst-st"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // Initial mount calls fetchStats once
    expect(fetchStatsSpy).toHaveBeenCalledTimes(1);

    // Step A: Storage change on STORAGE_KEY_ENVELOPE (which fires when background saves envelope, BEFORE drain completes)
    // Study Tracker MUST NOT trigger re-fetch yet, preventing querying Dexie before the record exists!
    storageListener(
      {
        [STORAGE_KEY_ENVELOPE]: {
          newValue: {
            schemaVersion: 1,
            activeTimerState: { state: 'completed' },
          },
        },
      },
      'local'
    );
    expect(fetchStatsSpy).toHaveBeenCalledTimes(1); // Still 1! No premature fetch!

    // Step B: Storage change on unrelated key
    storageListener(
      {
        other_key: { newValue: 'something' },
      },
      'local'
    );
    expect(fetchStatsSpy).toHaveBeenCalledTimes(1); // Still 1!

    // Step C: Dexie drain completed signal arrives (STORAGE_KEY_LAST_DRAINED_AT)
    storageListener(
      {
        [STORAGE_KEY_LAST_DRAINED_AT]: {
          oldValue: 1000,
          newValue: 2000,
        },
      },
      'local'
    );

    // fetchStats must now be called again, guaranteeing Dexie record is ready!
    expect(fetchStatsSpy).toHaveBeenCalledTimes(2);
    expect(fetchStatsSpy).toHaveBeenLastCalledWith('ws-1');
  });

  it('6. Cleanup: unregisters storage listener on unmount', () => {
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
      <StudyTrackerWidgetComponent
        instanceId="inst-st"
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
