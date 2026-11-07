import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePomodoroStore } from '../../../src/features/pomodoro/pomodoroStore';
import { createMockBrowser } from '../../mocks/browser';
import { ActiveTimerState } from '../../../src/types/pomodoro';

describe('Pomodoro Store & Multi-Tab Synchronization — Milestone 5.3.3', () => {
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
      isLoading: false,
      error: null,
      displayRemainingSeconds: 25 * 60,
    });
  });

  it('1. syncFromStorage applies state if revision is newer or equal', () => {
    const store = usePomodoroStore.getState();
    const newerState: ActiveTimerState = {
      state: 'running',
      revision: 2,
      mode: 'focus',
      currentCycleCount: 1,
      nextSuggestedMode: 'focus',
      persistenceHealth: 'healthy',
      sessionId: 'sess-sync-1',
      startedAt: Date.now(),
      targetEndTime: Date.now() + 1500 * 1000,
      durationMinutes: 25,
    };

    store.syncFromStorage(newerState);
    expect(usePomodoroStore.getState().activeTimerState.state).toBe('running');
    expect(usePomodoroStore.getState().activeTimerState.revision).toBe(2);
  });

  it('2. syncFromStorage ignores older revision to prevent stale UI overwrites', () => {
    usePomodoroStore.setState({
      activeTimerState: {
        state: 'running',
        revision: 5,
        mode: 'focus',
        currentCycleCount: 1,
        nextSuggestedMode: 'focus',
        persistenceHealth: 'healthy',
        sessionId: 'sess-sync-5',
        startedAt: Date.now(),
        targetEndTime: Date.now() + 1000 * 1000,
        durationMinutes: 25,
      },
    });

    const olderState: ActiveTimerState = {
      state: 'paused',
      revision: 3, // older than 5!
      mode: 'focus',
      currentCycleCount: 1,
      nextSuggestedMode: 'focus',
      persistenceHealth: 'healthy',
      sessionId: 'sess-sync-3',
      startedAt: Date.now(),
      pausedAt: Date.now(),
      remainingSeconds: 600,
      durationMinutes: 25,
    };

    usePomodoroStore.getState().syncFromStorage(olderState);
    // Still running with revision 5!
    expect(usePomodoroStore.getState().activeTimerState.state).toBe('running');
    expect(usePomodoroStore.getState().activeTimerState.revision).toBe(5);
  });

  it('3. tickCountdown decreases displayRemainingSeconds when state is running', () => {
    const now = Date.now();
    usePomodoroStore.setState({
      activeTimerState: {
        state: 'running',
        revision: 2,
        mode: 'focus',
        currentCycleCount: 1,
        nextSuggestedMode: 'focus',
        persistenceHealth: 'healthy',
        sessionId: 'sess-tick',
        startedAt: now,
        targetEndTime: now + 50 * 1000, // 50s remaining
        durationMinutes: 25,
      },
    });

    usePomodoroStore.getState().tickCountdown();
    expect(usePomodoroStore.getState().displayRemainingSeconds).toBeLessThanOrEqual(50);
    expect(usePomodoroStore.getState().displayRemainingSeconds).toBeGreaterThanOrEqual(49);
  });
});
