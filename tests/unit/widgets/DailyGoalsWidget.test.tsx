import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DailyGoalsWidgetComponent } from '../../../src/widgets/DailyGoalsWidget';
import { useDailyGoalsStore } from '../../../src/features/daily-goals/dailyGoalsStore';
import { STORAGE_KEY_LAST_DRAINED_AT, STORAGE_KEY_ENVELOPE } from '../../../src/features/pomodoro/storageService';
import { STORAGE_KEY_TODO_LAST_UPDATED_AT } from '../../../src/services/database/repositories/todoRepository';

describe('DailyGoalsWidgetComponent — Milestone 5.5 UI Component', () => {
  beforeEach(() => {
    useDailyGoalsStore.setState({
      summary: null,
      isLoading: false,
      error: null,
      isEditing: false,
      activeWorkspaceId: undefined,
    });
  });

  it('1. Renders empty state when there are no goals', () => {
    useDailyGoalsStore.setState({
      summary: {
        dateString: '2026-11-07',
        goals: [],
        overallPercentage: 0,
        allCompleted: false,
        completedCount: 0,
        totalCount: 0,
      },
    });

    render(
      <DailyGoalsWidgetComponent
        instanceId="inst-dg"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Daily Goals')).toBeInTheDocument();
    expect(screen.getByText('No daily goals configured.')).toBeInTheDocument();
  });

  it('2. Renders normal progress metrics, percentage badge, and goal progress bars', () => {
    useDailyGoalsStore.setState({
      summary: {
        dateString: '2026-11-07',
        goals: [
          {
            id: 'g-focus',
            title: 'Daily Focus Time',
            type: 'focus_time',
            targetValue: 120,
            currentValue: 60,
            unit: 'mins',
            dateString: '2026-11-07',
            percentage: 50,
            isCompleted: false,
            createdAt: 1000,
            updatedAt: 1000,
          },
          {
            id: 'g-sessions',
            title: 'Focus Sessions',
            type: 'focus_sessions',
            targetValue: 4,
            currentValue: 4,
            unit: 'sessions',
            dateString: '2026-11-07',
            percentage: 100,
            isCompleted: true,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        overallPercentage: 75,
        allCompleted: false,
        completedCount: 1,
        totalCount: 2,
      },
    });

    render(
      <DailyGoalsWidgetComponent
        instanceId="inst-dg"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Daily Goals')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // Overall badge
    expect(screen.getByText('Daily Focus Time')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('/ 120 mins')).toBeInTheDocument();
    expect(screen.getByText('Focus Sessions')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 completed')).toBeInTheDocument();
  });

  it('3. Renders celebratory banner when all goals are achieved', () => {
    useDailyGoalsStore.setState({
      summary: {
        dateString: '2026-11-07',
        goals: [
          {
            id: 'g-focus',
            title: 'Daily Focus Time',
            type: 'focus_time',
            targetValue: 120,
            currentValue: 120,
            unit: 'mins',
            dateString: '2026-11-07',
            percentage: 100,
            isCompleted: true,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        overallPercentage: 100,
        allCompleted: true,
        completedCount: 1,
        totalCount: 1,
      },
    });

    render(
      <DailyGoalsWidgetComponent
        instanceId="inst-dg"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText(/All daily goals achieved/i)).toBeInTheDocument();
  });

  it('4. Renders error state with retry button', () => {
    useDailyGoalsStore.setState({
      summary: null,
      isLoading: false,
      error: 'Simulated Dexie read error',
      fetchGoals: vi.fn(), // Prevent mount from overwriting error
    });

    render(
      <DailyGoalsWidgetComponent
        instanceId="inst-dg"
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

  it('5. Allows editing and saving daily targets with validation', async () => {
    const updateTargetSpy = vi.fn().mockResolvedValue({});
    useDailyGoalsStore.setState({
      updateTarget: updateTargetSpy,
      summary: {
        dateString: '2026-11-07',
        goals: [
          {
            id: 'g-time',
            title: 'Daily Focus Time',
            type: 'focus_time',
            targetValue: 120,
            currentValue: 0,
            unit: 'mins',
            dateString: '2026-11-07',
            percentage: 0,
            isCompleted: false,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        overallPercentage: 0,
        allCompleted: false,
        completedCount: 0,
        totalCount: 1,
      },
    });

    render(
      <DailyGoalsWidgetComponent
        instanceId="inst-dg"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // Click edit targets icon
    const editBtn = screen.getByTitle('Edit Targets');
    fireEvent.click(editBtn);

    // Target input should now be displayed
    const input = screen.getByDisplayValue('120');
    expect(input).toBeInTheDocument();

    // Try entering 0 (invalid)
    fireEvent.change(input, { target: { value: '0' } });
    const saveBtn = screen.getByTitle('Save Targets');
    fireEvent.click(saveBtn);

    // Validation error should show
    expect(screen.getByText(/must be a positive whole number/i)).toBeInTheDocument();
    expect(updateTargetSpy).not.toHaveBeenCalled();

    // Now enter valid target: 90
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateTargetSpy).toHaveBeenCalledWith('g-time', 90, 'ws-1');
    });
  });

  it('6. Live synchronization: re-fetches strictly when STORAGE_KEY_LAST_DRAINED_AT arrives', () => {
    const fetchGoalsSpy = vi.fn();
    useDailyGoalsStore.setState({
      fetchGoals: fetchGoalsSpy,
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
      <DailyGoalsWidgetComponent
        instanceId="inst-dg"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // Initial mount calls fetchGoals once
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(1);

    // Storage change on envelope (before Dexie drain completes) - MUST NOT re-fetch yet!
    storageListener(
      {
        [STORAGE_KEY_ENVELOPE]: { newValue: { activeTimerState: { state: 'completed' } } },
      },
      'local'
    );
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(1);

    // Storage change on unrelated key - MUST NOT re-fetch!
    storageListener({ other_key: { newValue: 'val' } }, 'local');
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(1);

    // Dexie drain completed signal arrives!
    storageListener(
      {
        [STORAGE_KEY_LAST_DRAINED_AT]: { newValue: 2000 },
      },
      'local'
    );

    // fetchGoals must now be triggered!
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(2);
    expect(fetchGoalsSpy).toHaveBeenLastCalledWith('ws-1');
  });

  it('7. Cleans up storage listener on unmount', () => {
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
      <DailyGoalsWidgetComponent
        instanceId="inst-dg"
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

  it('8. Issue B: Todo completion, reopening, cross-tab signals trigger Daily Goals refresh without duplicates', () => {
    const fetchGoalsSpy = vi.fn();
    useDailyGoalsStore.setState({
      fetchGoals: fetchGoalsSpy,
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
      <DailyGoalsWidgetComponent
        instanceId="inst-dg"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // Initial mount calls fetchGoals once
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(1);

    // 1. Task completed event arrives from storage
    storageListener(
      {
        [STORAGE_KEY_TODO_LAST_UPDATED_AT]: { oldValue: 1000, newValue: 2000 },
      },
      'local'
    );
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(2);
    expect(fetchGoalsSpy).toHaveBeenLastCalledWith('ws-1');

    // 2. Task reopened event arrives from storage
    storageListener(
      {
        [STORAGE_KEY_TODO_LAST_UPDATED_AT]: { oldValue: 2000, newValue: 3000 },
      },
      'local'
    );
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(3);

    // 3. Cross-tab signal (another tab completes a task)
    storageListener(
      {
        [STORAGE_KEY_TODO_LAST_UPDATED_AT]: { oldValue: 3000, newValue: 4000 },
      },
      'local'
    );
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(4);

    // 4. Repeated storage signals (e.g. multiple rapid syncs)
    storageListener(
      {
        [STORAGE_KEY_TODO_LAST_UPDATED_AT]: { oldValue: 4000, newValue: 5000 },
      },
      'local'
    );
    expect(fetchGoalsSpy).toHaveBeenCalledTimes(5);
  });
});
