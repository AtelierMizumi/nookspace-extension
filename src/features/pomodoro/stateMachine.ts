import {
  ActiveTimerState,
  IdleTimerState,
  RunningTimerState,
  PausedTimerState,
  CompletedTimerState,
  RecoveryRequiredTimerState,
  PomodoroMode,
  PomodoroModeConfig,
  OutboxSessionEntry,
  DEFAULT_POMODORO_CONFIG,
} from '../../types/pomodoro';

export type StateMachineEvent =
  | { type: 'START'; mode?: PomodoroMode; customDurationMinutes?: number; workspaceId?: string; sessionId: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'CANCEL' }
  | { type: 'RESET'; userConfirmed?: boolean }
  | { type: 'SKIP' }
  | { type: 'SWITCH_MODE'; mode: PomodoroMode }
  | { type: 'ALARM_EXPIRED'; completedSessionId: string }
  | { type: 'MARK_SAVED'; sessionId: string }
  | { type: 'SET_RECOVERY_REQUIRED'; failureReason: string; quarantineKey?: string }
  | { type: 'SET_HEALTH'; health: 'healthy' | 'degraded' | 'unavailable' };

export interface TransitionResult {
  nextState: ActiveTimerState;
  outboxEntryToCreate?: OutboxSessionEntry;
  alarmToSet?: {
    name: string;
    when: number;
  };
  alarmToClear?: string;
  notificationToSend?: {
    title: string;
    message: string;
  };
}

export function getDurationForMode(mode: PomodoroMode, config: PomodoroModeConfig): number {
  switch (mode) {
    case 'focus':
      return config.focusDurationMinutes;
    case 'shortBreak':
      return config.shortBreakDurationMinutes;
    case 'longBreak':
      return config.longBreakDurationMinutes;
  }
}

export function calculateNextSuggestedMode(
  currentMode: PomodoroMode,
  currentCycle: number,
  config: PomodoroModeConfig
): { nextMode: PomodoroMode; nextCycle: number } {
  if (currentMode === 'focus') {
    if (currentCycle >= config.longBreakInterval) {
      return { nextMode: 'longBreak', nextCycle: currentCycle };
    }
    return { nextMode: 'shortBreak', nextCycle: currentCycle };
  } else if (currentMode === 'shortBreak') {
    return { nextMode: 'focus', nextCycle: currentCycle + 1 };
  } else {
    // longBreak
    return { nextMode: 'focus', nextCycle: 1 };
  }
}

export function transitionTimer(
  currentState: ActiveTimerState,
  event: StateMachineEvent,
  now: number,
  config: PomodoroModeConfig = DEFAULT_POMODORO_CONFIG
): TransitionResult {
  const currentRevision = currentState.revision;
  const nextRevision = currentRevision + 1;

  // Global Health Update Event
  if (event.type === 'SET_HEALTH') {
    return {
      nextState: {
        ...currentState,
        persistenceHealth: event.health,
        revision: nextRevision,
      },
    };
  }

  // Global Mark Saved Event
  if (event.type === 'MARK_SAVED') {
    if (currentState.state === 'completed' && currentState.sessionId === event.sessionId) {
      return {
        nextState: {
          ...currentState,
          completedSessionSaved: true,
          revision: nextRevision,
        },
      };
    }
    return { nextState: currentState };
  }

  // Global Recovery Event
  if (event.type === 'SET_RECOVERY_REQUIRED') {
    return {
      nextState: {
        state: 'recovery_required',
        revision: nextRevision,
        mode: currentState.mode,
        currentCycleCount: currentState.currentCycleCount,
        nextSuggestedMode: currentState.nextSuggestedMode,
        persistenceHealth: currentState.persistenceHealth,
        workspaceId: currentState.workspaceId,
        quarantineKey: event.quarantineKey,
        failureReason: event.failureReason,
        detectedAt: now,
      },
      alarmToClear: currentState.state === 'running' ? `nookspace-pomodoro-timer__${currentState.sessionId}` : undefined,
    };
  }

  switch (currentState.state) {
    case 'recovery_required': {
      if (event.type === 'RESET') {
        if (!event.userConfirmed) {
          throw new Error('RESET from recovery_required requires userConfirmed: true');
        }
        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: 'focus',
            currentCycleCount: 1,
            nextSuggestedMode: 'focus',
            persistenceHealth: 'healthy',
            workspaceId: currentState.workspaceId,
          },
          alarmToClear: 'nookspace-pomodoro-timer__',
        };
      }
      throw new Error('TIMER_LOCKED_FOR_RECOVERY: All operations except confirmed RESET are locked');
    }

    case 'idle': {
      if (event.type === 'START') {
        const mode = event.mode || currentState.nextSuggestedMode || currentState.mode || 'focus';
        const durationMinutes = event.customDurationMinutes || getDurationForMode(mode, config);
        const targetEndTime = now + durationMinutes * 60 * 1000;
        const sessionId = event.sessionId;

        const nextState: RunningTimerState = {
          state: 'running',
          revision: nextRevision,
          mode,
          currentCycleCount: currentState.currentCycleCount,
          nextSuggestedMode: mode,
          persistenceHealth: currentState.persistenceHealth,
          workspaceId: event.workspaceId || currentState.workspaceId,
          sessionId,
          startedAt: now,
          targetEndTime,
          durationMinutes,
        };

        return {
          nextState,
          alarmToSet: {
            name: `nookspace-pomodoro-timer__${sessionId}`,
            when: targetEndTime,
          },
        };
      }

      if (event.type === 'SWITCH_MODE') {
        return {
          nextState: {
            ...currentState,
            revision: nextRevision,
            mode: event.mode,
            nextSuggestedMode: event.mode,
          },
        };
      }

      if (event.type === 'RESET') {
        return {
          nextState: {
            ...currentState,
            revision: nextRevision,
            mode: 'focus',
            currentCycleCount: 1,
            nextSuggestedMode: 'focus',
          },
        };
      }

      throw new Error(`INVALID_STATE_TRANSITION: Cannot perform ${event.type} in idle state`);
    }

    case 'running': {
      if (event.type === 'PAUSE') {
        const remainingSeconds = Math.max(1, Math.round((currentState.targetEndTime - now) / 1000));
        const nextState: PausedTimerState = {
          state: 'paused',
          revision: nextRevision,
          mode: currentState.mode,
          currentCycleCount: currentState.currentCycleCount,
          nextSuggestedMode: currentState.nextSuggestedMode,
          persistenceHealth: currentState.persistenceHealth,
          workspaceId: currentState.workspaceId,
          sessionId: currentState.sessionId,
          startedAt: currentState.startedAt,
          pausedAt: now,
          remainingSeconds,
          durationMinutes: currentState.durationMinutes,
        };

        return {
          nextState,
          alarmToClear: `nookspace-pomodoro-timer__${currentState.sessionId}`,
        };
      }

      if (event.type === 'CANCEL') {
        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: currentState.mode,
            currentCycleCount: currentState.currentCycleCount,
            nextSuggestedMode: 'focus',
            persistenceHealth: currentState.persistenceHealth,
            workspaceId: currentState.workspaceId,
          },
          alarmToClear: `nookspace-pomodoro-timer__${currentState.sessionId}`,
        };
      }

      if (event.type === 'RESET') {
        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: 'focus',
            currentCycleCount: 1,
            nextSuggestedMode: 'focus',
            persistenceHealth: currentState.persistenceHealth,
            workspaceId: currentState.workspaceId,
          },
          alarmToClear: `nookspace-pomodoro-timer__${currentState.sessionId}`,
        };
      }

      if (event.type === 'SKIP') {
        const { nextMode, nextCycle } = calculateNextSuggestedMode(
          currentState.mode,
          currentState.currentCycleCount,
          config
        );

        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: nextMode,
            currentCycleCount: nextCycle,
            nextSuggestedMode: nextMode,
            persistenceHealth: currentState.persistenceHealth,
            workspaceId: currentState.workspaceId,
          },
          alarmToClear: `nookspace-pomodoro-timer__${currentState.sessionId}`,
        };
      }

      if (event.type === 'ALARM_EXPIRED') {
        if (event.completedSessionId !== currentState.sessionId) {
          throw new Error('STALE_ALARM: Alarm session does not match current running session');
        }

        const { nextMode, nextCycle } = calculateNextSuggestedMode(
          currentState.mode,
          currentState.currentCycleCount,
          config
        );

        const outboxEntry: OutboxSessionEntry = {
          sessionId: currentState.sessionId,
          type: currentState.mode,
          durationMinutes: currentState.durationMinutes,
          startedAt: currentState.startedAt,
          completedAt: currentState.targetEndTime, // canonical scheduled target
          workspaceId: currentState.workspaceId,
          retryCount: 0,
          nextRetryAt: now,
          firstAttemptAt: now,
        };

        const nextState: CompletedTimerState = {
          state: 'completed',
          revision: nextRevision,
          mode: currentState.mode,
          currentCycleCount: nextCycle,
          nextSuggestedMode: nextMode,
          persistenceHealth: currentState.persistenceHealth,
          workspaceId: currentState.workspaceId,
          sessionId: currentState.sessionId,
          startedAt: currentState.startedAt,
          completedAt: currentState.targetEndTime,
          durationMinutes: currentState.durationMinutes,
          completedSessionSaved: false,
        };

        const notificationMessage =
          currentState.mode === 'focus'
            ? 'Great job! Focus session completed. Take a break!'
            : 'Break is over. Ready to start your next focus session?';

        return {
          nextState,
          outboxEntryToCreate: outboxEntry,
          alarmToClear: `nookspace-pomodoro-timer__${currentState.sessionId}`,
          notificationToSend: {
            title: 'NookSpace Pomodoro',
            message: notificationMessage,
          },
        };
      }

      if (event.type === 'START' || event.type === 'RESUME') {
        throw new Error('TIMER_ALREADY_RUNNING');
      }

      if (event.type === 'SWITCH_MODE') {
        throw new Error('CANNOT_SWITCH_MODE_WHILE_RUNNING');
      }

      throw new Error(`INVALID_STATE_TRANSITION: Cannot perform ${(event as any).type} in running state`);
    }

    case 'paused': {
      if (event.type === 'RESUME') {
        const targetEndTime = now + currentState.remainingSeconds * 1000;
        const nextState: RunningTimerState = {
          state: 'running',
          revision: nextRevision,
          mode: currentState.mode,
          currentCycleCount: currentState.currentCycleCount,
          nextSuggestedMode: currentState.nextSuggestedMode,
          persistenceHealth: currentState.persistenceHealth,
          workspaceId: currentState.workspaceId,
          sessionId: currentState.sessionId,
          startedAt: currentState.startedAt,
          targetEndTime,
          durationMinutes: currentState.durationMinutes,
        };

        return {
          nextState,
          alarmToSet: {
            name: `nookspace-pomodoro-timer__${currentState.sessionId}`,
            when: targetEndTime,
          },
        };
      }

      if (event.type === 'CANCEL') {
        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: currentState.mode,
            currentCycleCount: currentState.currentCycleCount,
            nextSuggestedMode: 'focus',
            persistenceHealth: currentState.persistenceHealth,
            workspaceId: currentState.workspaceId,
          },
        };
      }

      if (event.type === 'RESET') {
        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: 'focus',
            currentCycleCount: 1,
            nextSuggestedMode: 'focus',
            persistenceHealth: currentState.persistenceHealth,
            workspaceId: currentState.workspaceId,
          },
        };
      }

      if (event.type === 'SKIP') {
        const { nextMode, nextCycle } = calculateNextSuggestedMode(
          currentState.mode,
          currentState.currentCycleCount,
          config
        );

        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: nextMode,
            currentCycleCount: nextCycle,
            nextSuggestedMode: nextMode,
            persistenceHealth: currentState.persistenceHealth,
            workspaceId: currentState.workspaceId,
          },
        };
      }

      if (event.type === 'START') {
        throw new Error('CANNOT_START_WHILE_PAUSED: Must resume or reset first');
      }

      if (event.type === 'PAUSE') {
        throw new Error('TIMER_ALREADY_PAUSED');
      }

      if (event.type === 'SWITCH_MODE') {
        throw new Error('CANNOT_SWITCH_MODE_WHILE_PAUSED');
      }

      throw new Error(`INVALID_STATE_TRANSITION: Cannot perform ${event.type} in paused state`);
    }

    case 'completed': {
      if (event.type === 'START') {
        const mode = event.mode || currentState.nextSuggestedMode || 'focus';
        const durationMinutes = event.customDurationMinutes || getDurationForMode(mode, config);
        const targetEndTime = now + durationMinutes * 60 * 1000;
        const sessionId = event.sessionId;

        const nextState: RunningTimerState = {
          state: 'running',
          revision: nextRevision,
          mode,
          currentCycleCount: currentState.currentCycleCount,
          nextSuggestedMode: mode,
          persistenceHealth: currentState.persistenceHealth,
          workspaceId: event.workspaceId || currentState.workspaceId,
          sessionId,
          startedAt: now,
          targetEndTime,
          durationMinutes,
        };

        return {
          nextState,
          alarmToSet: {
            name: `nookspace-pomodoro-timer__${sessionId}`,
            when: targetEndTime,
          },
        };
      }

      if (event.type === 'SWITCH_MODE') {
        return {
          nextState: {
            ...currentState,
            revision: nextRevision,
            nextSuggestedMode: event.mode,
          },
        };
      }

      if (event.type === 'RESET') {
        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: 'focus',
            currentCycleCount: 1,
            nextSuggestedMode: 'focus',
            persistenceHealth: currentState.persistenceHealth,
            workspaceId: currentState.workspaceId,
          },
        };
      }

      if (event.type === 'CANCEL' || event.type === 'SKIP') {
        return {
          nextState: {
            state: 'idle',
            revision: nextRevision,
            mode: currentState.nextSuggestedMode,
            currentCycleCount: currentState.currentCycleCount,
            nextSuggestedMode: currentState.nextSuggestedMode,
            persistenceHealth: currentState.persistenceHealth,
            workspaceId: currentState.workspaceId,
          },
        };
      }

      throw new Error(`INVALID_STATE_TRANSITION: Cannot perform ${event.type} in completed state`);
    }
  }
}
