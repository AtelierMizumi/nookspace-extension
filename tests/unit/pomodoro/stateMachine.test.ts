import { describe, it, expect } from 'vitest';
import {
  transitionTimer,
  getDurationForMode,
  calculateNextSuggestedMode,
} from '../../../src/features/pomodoro/stateMachine';
import {
  ActiveTimerState,
  DEFAULT_POMODORO_CONFIG,
  ActiveTimerStateSchema,
  PomodoroStorageEnvelopeSchema,
} from '../../../src/types/pomodoro';

describe('Pomodoro State Machine — Milestone 5.3.1', () => {
  const baseIdle: ActiveTimerState = {
    state: 'idle',
    revision: 1,
    mode: 'focus',
    currentCycleCount: 1,
    nextSuggestedMode: 'focus',
    persistenceHealth: 'healthy',
  };

  it('1. START transition from idle creates running state with targetEndTime and revision + 1', () => {
    const now = 100000;
    const res = transitionTimer(
      baseIdle,
      { type: 'START', sessionId: 'test-session-1' },
      now,
      DEFAULT_POMODORO_CONFIG
    );

    expect(res.nextState.state).toBe('running');
    expect(res.nextState.revision).toBe(2);
    if (res.nextState.state === 'running') {
      expect(res.nextState.sessionId).toBe('test-session-1');
      expect(res.nextState.durationMinutes).toBe(25);
      expect(res.nextState.targetEndTime).toBe(now + 25 * 60 * 1000);
      expect(res.alarmToSet?.name).toBe('nookspace-pomodoro-timer__test-session-1');
      expect(res.alarmToSet?.when).toBe(res.nextState.targetEndTime);
    }
  });

  it('2. PAUSE transition from running creates paused state with remainingSeconds', () => {
    const startNow = 100000;
    const running = transitionTimer(
      baseIdle,
      { type: 'START', sessionId: 'test-session-1' },
      startNow,
      DEFAULT_POMODORO_CONFIG
    ).nextState;

    const pauseNow = startNow + 5 * 60 * 1000; // 5 mins in
    const res = transitionTimer(running, { type: 'PAUSE' }, pauseNow);

    expect(res.nextState.state).toBe('paused');
    expect(res.nextState.revision).toBe(3);
    if (res.nextState.state === 'paused') {
      expect(res.nextState.remainingSeconds).toBe(20 * 60);
      expect(res.alarmToClear).toBe('nookspace-pomodoro-timer__test-session-1');
    }
  });

  it('3. RESUME transition from paused creates running state with new targetEndTime', () => {
    const startNow = 100000;
    const running = transitionTimer(
      baseIdle,
      { type: 'START', sessionId: 'test-session-1' },
      startNow
    ).nextState;
    const paused = transitionTimer(running, { type: 'PAUSE' }, startNow + 5 * 60 * 1000).nextState;

    const resumeNow = startNow + 10 * 60 * 1000; // paused for 5 mins
    const res = transitionTimer(paused, { type: 'RESUME' }, resumeNow);

    expect(res.nextState.state).toBe('running');
    expect(res.nextState.revision).toBe(4);
    if (res.nextState.state === 'running') {
      // 20 mins remaining from resumeNow
      expect(res.nextState.targetEndTime).toBe(resumeNow + 20 * 60 * 1000);
      expect(res.alarmToSet?.when).toBe(res.nextState.targetEndTime);
    }
  });

  it('4. Full 4-Cycle Pomodoro Progression', () => {
    let state: ActiveTimerState = baseIdle;
    let now = 100000;

    // Cycle 1 Focus
    state = transitionTimer(state, { type: 'START', sessionId: 's1' }, now).nextState;
    expect(state.currentCycleCount).toBe(1);
    now = (state as any).targetEndTime;
    let res = transitionTimer(state, { type: 'ALARM_EXPIRED', completedSessionId: 's1' }, now);
    state = res.nextState;
    expect(state.state).toBe('completed');
    expect(state.currentCycleCount).toBe(1);
    expect(state.nextSuggestedMode).toBe('shortBreak');
    expect(res.outboxEntryToCreate?.durationMinutes).toBe(25);

    // Short Break 1
    state = transitionTimer(state, { type: 'START', mode: 'shortBreak', sessionId: 'sb1' }, now).nextState;
    now = (state as any).targetEndTime;
    res = transitionTimer(state, { type: 'ALARM_EXPIRED', completedSessionId: 'sb1' }, now);
    state = res.nextState;
    expect(state.currentCycleCount).toBe(2);
    expect(state.nextSuggestedMode).toBe('focus');

    // Cycle 2 Focus
    state = transitionTimer(state, { type: 'START', sessionId: 's2' }, now).nextState;
    now = (state as any).targetEndTime;
    res = transitionTimer(state, { type: 'ALARM_EXPIRED', completedSessionId: 's2' }, now);
    state = res.nextState;
    expect(state.currentCycleCount).toBe(2);
    expect(state.nextSuggestedMode).toBe('shortBreak');

    // Short Break 2
    state = transitionTimer(state, { type: 'START', mode: 'shortBreak', sessionId: 'sb2' }, now).nextState;
    now = (state as any).targetEndTime;
    res = transitionTimer(state, { type: 'ALARM_EXPIRED', completedSessionId: 'sb2' }, now);
    state = res.nextState;
    expect(state.currentCycleCount).toBe(3);
    expect(state.nextSuggestedMode).toBe('focus');

    // Cycle 3 Focus
    state = transitionTimer(state, { type: 'START', sessionId: 's3' }, now).nextState;
    now = (state as any).targetEndTime;
    res = transitionTimer(state, { type: 'ALARM_EXPIRED', completedSessionId: 's3' }, now);
    state = res.nextState;
    expect(state.currentCycleCount).toBe(3);
    expect(state.nextSuggestedMode).toBe('shortBreak');

    // Short Break 3
    state = transitionTimer(state, { type: 'START', mode: 'shortBreak', sessionId: 'sb3' }, now).nextState;
    now = (state as any).targetEndTime;
    res = transitionTimer(state, { type: 'ALARM_EXPIRED', completedSessionId: 'sb3' }, now);
    state = res.nextState;
    expect(state.currentCycleCount).toBe(4);
    expect(state.nextSuggestedMode).toBe('focus');

    // Cycle 4 Focus -> MUST SUGGEST longBreak!
    state = transitionTimer(state, { type: 'START', sessionId: 's4' }, now).nextState;
    now = (state as any).targetEndTime;
    res = transitionTimer(state, { type: 'ALARM_EXPIRED', completedSessionId: 's4' }, now);
    state = res.nextState;
    expect(state.currentCycleCount).toBe(4);
    expect(state.nextSuggestedMode).toBe('longBreak');

    // Long Break 4 -> MUST RESET CYCLE TO 1
    state = transitionTimer(state, { type: 'START', mode: 'longBreak', sessionId: 'lb1' }, now).nextState;
    now = (state as any).targetEndTime;
    res = transitionTimer(state, { type: 'ALARM_EXPIRED', completedSessionId: 'lb1' }, now);
    state = res.nextState;
    expect(state.currentCycleCount).toBe(1);
    expect(state.nextSuggestedMode).toBe('focus');
  });

  it('5. SKIP transitions discard session and suggest next mode', () => {
    const running = transitionTimer(
      baseIdle,
      { type: 'START', sessionId: 'skip-s1' },
      100000
    ).nextState;

    const res = transitionTimer(running, { type: 'SKIP' }, 105000);
    expect(res.nextState.state).toBe('idle');
    expect(res.outboxEntryToCreate).toBeUndefined(); // NO outbox on skip!
    expect(res.nextState.nextSuggestedMode).toBe('shortBreak');
  });

  it('6. CANCEL resets to idle without outbox', () => {
    const running = transitionTimer(
      baseIdle,
      { type: 'START', sessionId: 'cancel-s1' },
      100000
    ).nextState;

    const res = transitionTimer(running, { type: 'CANCEL' }, 105000);
    expect(res.nextState.state).toBe('idle');
    expect(res.outboxEntryToCreate).toBeUndefined();
    expect(res.alarmToClear).toBe('nookspace-pomodoro-timer__cancel-s1');
  });

  it('7. RECOVERY_REQUIRED locks operations until confirmed RESET', () => {
    const recState = transitionTimer(
      baseIdle,
      { type: 'SET_RECOVERY_REQUIRED', failureReason: 'Test Corruption' },
      100000
    ).nextState;

    expect(recState.state).toBe('recovery_required');

    // Any normal command must throw
    expect(() => transitionTimer(recState, { type: 'START', sessionId: 'new' }, 101000)).toThrow(
      /TIMER_LOCKED_FOR_RECOVERY/
    );

    // Unconfirmed reset must throw
    expect(() => transitionTimer(recState, { type: 'RESET' }, 101000)).toThrow(
      /userConfirmed/
    );

    // Confirmed reset succeeds
    const resetRes = transitionTimer(recState, { type: 'RESET', userConfirmed: true }, 101000);
    expect(resetRes.nextState.state).toBe('idle');
    expect(resetRes.nextState.currentCycleCount).toBe(1);
  });

  it('8. Validates ActiveTimerState Zod schema for all states', () => {
    const idle: ActiveTimerState = baseIdle;
    expect(ActiveTimerStateSchema.safeParse(idle).success).toBe(true);

    const running = transitionTimer(idle, { type: 'START', sessionId: 's1' }, 1000).nextState;
    expect(ActiveTimerStateSchema.safeParse(running).success).toBe(true);

    const paused = transitionTimer(running, { type: 'PAUSE' }, 2000).nextState;
    expect(ActiveTimerStateSchema.safeParse(paused).success).toBe(true);

    const completed = transitionTimer(
      running,
      { type: 'ALARM_EXPIRED', completedSessionId: 's1' },
      (running as any).targetEndTime
    ).nextState;
    expect(ActiveTimerStateSchema.safeParse(completed).success).toBe(true);
  });
});
