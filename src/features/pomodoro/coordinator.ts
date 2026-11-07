import {
  ActiveTimerState,
  PomodoroCommandMessage,
  PomodoroCommandResult,
  PomodoroStorageEnvelope,
  DEFAULT_POMODORO_CONFIG,
} from '../../types/pomodoro';
import { storageService, StorageService } from './storageService';
import { transitionTimer } from './stateMachine';
import { outboxService, OutboxService } from './outboxService';
import { browserApi } from '../../services/browser';

type TaskFunction<T> = () => Promise<T>;

export class CoordinatorQueue {
  private internalChain: Promise<void> = Promise.resolve();

  public enqueue<T>(task: TaskFunction<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const safeExecutionUnit = async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.internalChain = this.internalChain.then(safeExecutionUnit, safeExecutionUnit);
    });
  }
}

export class PomodoroCoordinator {
  public queue: CoordinatorQueue;

  constructor(
    private storage: StorageService = storageService,
    private outbox: OutboxService = outboxService
  ) {
    this.queue = new CoordinatorQueue();
  }

  /**
   * Main entry point for executing commands sequentially.
   */
  public async handleCommand(cmd: PomodoroCommandMessage): Promise<PomodoroCommandResult> {
    return this.queue.enqueue(async () => {
      const envelope = await this.storage.loadEnvelope();
      const state = envelope.activeTimerState;

      // GET_STATE command simply returns current envelope
      if (cmd.command === 'GET_STATE') {
        return {
          success: true,
          state,
          envelope,
        };
      }

      // Check deduplication
      const existingCmd = envelope.recentCommands.find((c) => c.commandId === cmd.commandId);
      if (existingCmd) {
        return {
          success: true,
          duplicated: true,
          state,
          envelope,
        };
      }

      // Validate expectedRevision for state-changing commands
      if (cmd.command !== 'UPDATE_CONFIG' && cmd.expectedRevision !== undefined) {
        if (cmd.expectedRevision < state.revision) {
          return {
            success: false,
            code: 'STALE_REVISION',
            error: `Stale revision: expected ${cmd.expectedRevision}, but state is ${state.revision}`,
            state,
            envelope,
          };
        }
        if (cmd.expectedRevision > state.revision) {
          return {
            success: false,
            code: 'INVALID_REVISION',
            error: `Invalid revision: future revision ${cmd.expectedRevision} rejected`,
            state,
            envelope,
          };
        }
      }

      // Check Dead-Letter Backpressure before START
      if (cmd.command === 'START') {
        const deadLetter = await this.storage.loadDeadLetter();
        if (envelope.pendingOutbox.length >= 50 || deadLetter.length >= 200) {
          return {
            success: false,
            code: 'STORAGE_CAPACITY_BACKPRESSURE',
            error: 'Storage backlog congested. Cannot start new session.',
            state,
            envelope,
          };
        }
      }

      // Handle UPDATE_CONFIG
      if (cmd.command === 'UPDATE_CONFIG' && cmd.payload?.config) {
        const newConfig = {
          ...envelope.config,
          ...cmd.payload.config,
        };
        const nextState = {
          ...state,
          revision: state.revision + 1,
        };
        const updatedEnvelope: PomodoroStorageEnvelope = {
          ...envelope,
          config: newConfig,
          activeTimerState: nextState,
          recentCommands: this.appendRecentCommand(envelope.recentCommands, cmd.commandId, cmd.command, nextState.revision),
          lastSavedAt: Date.now(),
        };
        await this.storage.saveEnvelope(updatedEnvelope);
        return {
          success: true,
          state: nextState,
          envelope: updatedEnvelope,
        };
      }

      // Map command to stateMachineEvent
      let event: any = null;
      const now = Date.now();

      switch (cmd.command) {
        case 'START':
          event = {
            type: 'START',
            mode: cmd.payload?.mode,
            customDurationMinutes: cmd.payload?.customDurationMinutes,
            workspaceId: cmd.payload?.workspaceId,
            sessionId: `session_${now}_${Math.random().toString(36).substring(2, 9)}`,
          };
          break;
        case 'PAUSE':
          event = { type: 'PAUSE' };
          break;
        case 'RESUME':
          event = { type: 'RESUME' };
          break;
        case 'CANCEL':
          event = { type: 'CANCEL' };
          break;
        case 'RESET':
          event = { type: 'RESET', userConfirmed: cmd.payload?.userConfirmed };
          break;
        case 'SKIP':
          event = { type: 'SKIP' };
          break;
        case 'SWITCH_MODE':
          event = { type: 'SWITCH_MODE', mode: cmd.payload?.mode || 'focus' };
          break;
        default:
          return {
            success: false,
            code: 'INVALID_COMMAND',
            error: `Unsupported command: ${cmd.command}`,
            state,
            envelope,
          };
      }

      try {
        const transitionRes = transitionTimer(state, event, now, envelope.config);
        const nextState = transitionRes.nextState;

        // If transitioning from recovery_required via confirmed RESET, clear the Recovery Marker!
        if (state.state === 'recovery_required' && event.type === 'RESET') {
          await this.storage.clearRecoveryMarker();
        }

        // Construct new envelope
        const nextOutbox = [...envelope.pendingOutbox];
        if (transitionRes.outboxEntryToCreate) {
          nextOutbox.push(transitionRes.outboxEntryToCreate);
        }

        const nextRecentCommands = this.appendRecentCommand(
          envelope.recentCommands,
          cmd.commandId,
          cmd.command,
          nextState.revision
        );

        const updatedEnvelope: PomodoroStorageEnvelope = {
          ...envelope,
          activeTimerState: nextState,
          pendingOutbox: nextOutbox,
          recentCommands: nextRecentCommands,
          lastSavedAt: now,
        };

        // Persist Envelope
        try {
          await this.storage.saveEnvelope(updatedEnvelope);
        } catch (saveErr) {
          // If storage save fails, attempt emergency drain to free quota
          await this.outbox.drainPendingOutbox();
          // Retry save once
          await this.storage.saveEnvelope(updatedEnvelope);
        }

        // Post-commit side effects:
        if (transitionRes.alarmToClear) {
          await browserApi.alarms.clear(transitionRes.alarmToClear);
        }
        if (transitionRes.alarmToSet) {
          await browserApi.alarms.create(transitionRes.alarmToSet.name, {
            when: transitionRes.alarmToSet.when,
          });
        }
        if (transitionRes.notificationToSend && envelope.config.soundEnabled) {
          await browserApi.notifications.create({
            title: transitionRes.notificationToSend.title,
            message: transitionRes.notificationToSend.message,
          });
        }

        // If outbox entry was created, trigger background drain asynchronously
        if (transitionRes.outboxEntryToCreate) {
          this.outbox.drainPendingOutbox().catch(() => {});
        }

        return {
          success: true,
          state: nextState,
          envelope: updatedEnvelope,
        };
      } catch (transErr: any) {
        return {
          success: false,
          code: 'TRANSITION_ERROR',
          error: transErr?.message || String(transErr),
          state,
          envelope,
        };
      }
    });
  }

  /**
   * Alarm event processing inside the queue with 5-layer validation.
   */
  public async handleAlarm(alarm: { name: string; scheduledTime?: number }): Promise<void> {
    return this.queue.enqueue(async () => {
      if (!alarm.name.startsWith('nookspace-pomodoro-timer__')) {
        return;
      }

      const envelope = await this.storage.loadEnvelope();
      const state = envelope.activeTimerState;

      // Layer 1: Check running state
      if (state.state !== 'running') {
        return;
      }

      // Layer 2: Check Session ID
      const alarmSessionId = alarm.name.split('__')[1];
      if (state.sessionId !== alarmSessionId) {
        return;
      }

      // Layer 3: Check scheduledTime matches targetEndTime (tolerance 1500ms)
      if (alarm.scheduledTime !== undefined) {
        const scheduleDelta = Math.abs(alarm.scheduledTime - state.targetEndTime);
        if (scheduleDelta > 1500) {
          // Stale alarm from same session before resume! Do not clear new alarm!
          return;
        }
      }

      // Layer 4: Check if reached targetEndTime (early jitter check)
      const now = Date.now();
      if (now < state.targetEndTime) {
        // Early alarm due to jitter, reschedule
        await browserApi.alarms.create(alarm.name, { when: state.targetEndTime });
        return;
      }

      // Layer 5: Valid completion transition
      const transitionRes = transitionTimer(
        state,
        { type: 'ALARM_EXPIRED', completedSessionId: state.sessionId },
        now,
        envelope.config
      );

      const nextOutbox = [...envelope.pendingOutbox];
      if (transitionRes.outboxEntryToCreate) {
        nextOutbox.push(transitionRes.outboxEntryToCreate);
      }

      const updatedEnvelope: PomodoroStorageEnvelope = {
        ...envelope,
        activeTimerState: transitionRes.nextState,
        pendingOutbox: nextOutbox,
        lastSavedAt: now,
      };

      await this.storage.saveEnvelope(updatedEnvelope);

      // Post-commit effects
      if (transitionRes.alarmToClear) {
        await browserApi.alarms.clear(transitionRes.alarmToClear);
      }
      if (transitionRes.notificationToSend && envelope.config.soundEnabled) {
        await browserApi.notifications.create({
          title: transitionRes.notificationToSend.title,
          message: transitionRes.notificationToSend.message,
        });
      }

      // Drain outbox to Dexie
      await this.outbox.drainPendingOutbox().catch(() => {});
    });
  }

  /**
   * Startup recovery task executed when the Background worker initializes.
   */
  public async handleStartupRecovery(): Promise<void> {
    return this.queue.enqueue(async () => {
      const envelope = await this.storage.loadEnvelope();
      const state = envelope.activeTimerState;
      const now = Date.now();

      // If timer is running and time has already elapsed, complete it
      if (state.state === 'running' && now >= state.targetEndTime) {
        await this.handleAlarm({
          name: `nookspace-pomodoro-timer__${state.sessionId}`,
          scheduledTime: state.targetEndTime,
        });
      }

      // Drain any pending outbox items or dead-letter
      await this.outbox.drainPendingOutbox().catch(() => {});
      await this.outbox.drainDeadLetter().catch(() => {});
    });
  }

  private appendRecentCommand(
    recent: any[],
    commandId: string,
    command: string,
    resultingRevision: number
  ): any[] {
    const now = Date.now();
    // 10 minutes retention window
    const cleaned = recent.filter((r) => now - r.processedAt < 10 * 60 * 1000);
    cleaned.push({
      commandId,
      command,
      processedAt: now,
      resultingRevision,
    });
    // Keep max 30 recent commands
    return cleaned.slice(-30);
  }
}

export const pomodoroCoordinator = new PomodoroCoordinator();
