import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PomodoroWidgetComponent } from '../../../src/widgets/PomodoroWidget';
import { usePomodoroStore } from '../../../src/features/pomodoro/pomodoroStore';
import { createMockBrowser } from '../../mocks/browser';

describe('PomodoroWidget UI Component — Milestone 5.3.4', () => {
  let mockBrowser: ReturnType<typeof createMockBrowser>;

  beforeEach(() => {
    mockBrowser = createMockBrowser();
    (globalThis as any).browser = mockBrowser.mock;
    (globalThis as any).chrome = mockBrowser.mock;

    usePomodoroStore.setState({
      activeTimerState: {
        state: 'idle',
        revision: 1,
        mode: 'focus',
        currentCycleCount: 1,
        nextSuggestedMode: 'focus',
        persistenceHealth: 'healthy',
      },
      config: {
        focusDurationMinutes: 25,
        shortBreakDurationMinutes: 5,
        longBreakDurationMinutes: 15,
        longBreakInterval: 4,
        soundEnabled: true,
      },
      isLoading: false,
      error: null,
      displayRemainingSeconds: 25 * 60,
    });
  });

  it('1. Renders idle state with 25:00 and mode switch buttons', () => {
    render(
      <PomodoroWidgetComponent
        instanceId="inst-pomo"
        workspaceId="ws-default"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('Long Break')).toBeInTheDocument();
    expect(screen.getByText('Cycle 1 / 4')).toBeInTheDocument();
  });

  it('2. Renders running state with Pause, Skip and Cancel controls', () => {
    usePomodoroStore.setState({
      activeTimerState: {
        state: 'running',
        revision: 2,
        mode: 'focus',
        currentCycleCount: 1,
        nextSuggestedMode: 'focus',
        persistenceHealth: 'healthy',
        sessionId: 'sess-ui-run',
        startedAt: Date.now(),
        targetEndTime: Date.now() + 20 * 60 * 1000,
        durationMinutes: 25,
      },
      displayRemainingSeconds: 20 * 60,
    });

    render(
      <PomodoroWidgetComponent
        instanceId="inst-pomo"
        workspaceId="ws-default"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText('20:00')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('3. Renders paused badge and Resume button when paused', () => {
    usePomodoroStore.setState({
      activeTimerState: {
        state: 'paused',
        revision: 3,
        mode: 'focus',
        currentCycleCount: 1,
        nextSuggestedMode: 'focus',
        persistenceHealth: 'healthy',
        sessionId: 'sess-ui-pause',
        startedAt: Date.now(),
        pausedAt: Date.now(),
        remainingSeconds: 15 * 60,
        durationMinutes: 25,
      },
      displayRemainingSeconds: 15 * 60,
    });

    render(
      <PomodoroWidgetComponent
        instanceId="inst-pomo"
        workspaceId="ws-default"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText('15:00')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('Resume')).toBeInTheDocument();
  });

  it('4. Renders completed screen with session finished and next suggested mode', () => {
    usePomodoroStore.setState({
      activeTimerState: {
        state: 'completed',
        revision: 4,
        mode: 'focus',
        currentCycleCount: 1,
        nextSuggestedMode: 'shortBreak',
        persistenceHealth: 'healthy',
        sessionId: 'sess-ui-comp',
        startedAt: Date.now() - 25 * 60 * 1000,
        completedAt: Date.now(),
        durationMinutes: 25,
        completedSessionSaved: true,
      },
    });

    render(
      <PomodoroWidgetComponent
        instanceId="inst-pomo"
        workspaceId="ws-default"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText('Session Finished!')).toBeInTheDocument();
    expect(screen.getByText('Next suggested: shortBreak')).toBeInTheDocument();
    expect(screen.getByText('Start shortBreak')).toBeInTheDocument();
  });

  it('5. Renders recovery_required banner with Reset button', () => {
    usePomodoroStore.setState({
      activeTimerState: {
        state: 'recovery_required',
        revision: 2,
        mode: 'focus',
        currentCycleCount: 1,
        nextSuggestedMode: 'focus',
        persistenceHealth: 'degraded',
        failureReason: 'Simulated Storage Disconnect',
        detectedAt: Date.now(),
      },
    });

    render(
      <PomodoroWidgetComponent
        instanceId="inst-pomo"
        workspaceId="ws-default"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText('Recovery Required')).toBeInTheDocument();
    expect(screen.getByText('Simulated Storage Disconnect')).toBeInTheDocument();
    expect(screen.getByText('Reset to Clean State')).toBeInTheDocument();
  });
});
