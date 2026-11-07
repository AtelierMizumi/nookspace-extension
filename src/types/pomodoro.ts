import { z } from 'zod';

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';
export type PomodoroState = 'idle' | 'running' | 'paused' | 'completed' | 'recovery_required';
export type PersistenceHealth = 'healthy' | 'degraded' | 'unavailable';

export interface PomodoroModeConfig {
  focusDurationMinutes: number;
  shortBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  longBreakInterval: number; // default: 4 Focus sessions
  soundEnabled: boolean;
}

export const PomodoroModeConfigSchema = z.object({
  focusDurationMinutes: z.number().int().min(1).max(180).default(25),
  shortBreakDurationMinutes: z.number().int().min(1).max(60).default(5),
  longBreakDurationMinutes: z.number().int().min(1).max(60).default(15),
  longBreakInterval: z.number().int().min(1).max(12).default(4),
  soundEnabled: z.boolean().default(true),
});

export const DEFAULT_POMODORO_CONFIG: PomodoroModeConfig = {
  focusDurationMinutes: 25,
  shortBreakDurationMinutes: 5,
  longBreakDurationMinutes: 15,
  longBreakInterval: 4,
  soundEnabled: true,
};

// Base Active Timer State
export interface BaseTimerState {
  state: PomodoroState;
  revision: number;
  mode: PomodoroMode;
  currentCycleCount: number; // 1 to longBreakInterval
  nextSuggestedMode: PomodoroMode;
  persistenceHealth: PersistenceHealth;
  workspaceId?: string;
}

export interface IdleTimerState extends BaseTimerState {
  state: 'idle';
}

export interface RunningTimerState extends BaseTimerState {
  state: 'running';
  sessionId: string;
  startedAt: number;
  targetEndTime: number;
  durationMinutes: number; // Planned duration
}

export interface PausedTimerState extends BaseTimerState {
  state: 'paused';
  sessionId: string;
  startedAt: number;
  pausedAt: number;
  remainingSeconds: number; // positive integer >= 1
  durationMinutes: number;
  clockAnomalyDetected?: boolean;
}

export interface CompletedTimerState extends BaseTimerState {
  state: 'completed';
  sessionId: string;
  startedAt: number;
  completedAt: number;
  durationMinutes: number;
  completedSessionSaved: boolean;
}

export interface RecoveryRequiredTimerState extends BaseTimerState {
  state: 'recovery_required';
  quarantineKey?: string;
  failureReason: string;
  detectedAt: number;
}

export type ActiveTimerState =
  | IdleTimerState
  | RunningTimerState
  | PausedTimerState
  | CompletedTimerState
  | RecoveryRequiredTimerState;

export const ActiveTimerStateSchema = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('idle'),
    revision: z.number().int().nonnegative(),
    mode: z.enum(['focus', 'shortBreak', 'longBreak']),
    currentCycleCount: z.number().int().min(1),
    nextSuggestedMode: z.enum(['focus', 'shortBreak', 'longBreak']),
    persistenceHealth: z.enum(['healthy', 'degraded', 'unavailable']),
    workspaceId: z.string().optional(),
  }),
  z.object({
    state: z.literal('running'),
    revision: z.number().int().nonnegative(),
    mode: z.enum(['focus', 'shortBreak', 'longBreak']),
    currentCycleCount: z.number().int().min(1),
    nextSuggestedMode: z.enum(['focus', 'shortBreak', 'longBreak']),
    persistenceHealth: z.enum(['healthy', 'degraded', 'unavailable']),
    workspaceId: z.string().optional(),
    sessionId: z.string().min(1),
    startedAt: z.number().int().positive(),
    targetEndTime: z.number().int().positive(),
    durationMinutes: z.number().int().positive(),
  }),
  z.object({
    state: z.literal('paused'),
    revision: z.number().int().nonnegative(),
    mode: z.enum(['focus', 'shortBreak', 'longBreak']),
    currentCycleCount: z.number().int().min(1),
    nextSuggestedMode: z.enum(['focus', 'shortBreak', 'longBreak']),
    persistenceHealth: z.enum(['healthy', 'degraded', 'unavailable']),
    workspaceId: z.string().optional(),
    sessionId: z.string().min(1),
    startedAt: z.number().int().positive(),
    pausedAt: z.number().int().positive(),
    remainingSeconds: z.number().int().positive(),
    durationMinutes: z.number().int().positive(),
    clockAnomalyDetected: z.boolean().optional(),
  }),
  z.object({
    state: z.literal('completed'),
    revision: z.number().int().nonnegative(),
    mode: z.enum(['focus', 'shortBreak', 'longBreak']),
    currentCycleCount: z.number().int().min(1),
    nextSuggestedMode: z.enum(['focus', 'shortBreak', 'longBreak']),
    persistenceHealth: z.enum(['healthy', 'degraded', 'unavailable']),
    workspaceId: z.string().optional(),
    sessionId: z.string().min(1),
    startedAt: z.number().int().positive(),
    completedAt: z.number().int().positive(),
    durationMinutes: z.number().int().positive(),
    completedSessionSaved: z.boolean(),
  }),
  z.object({
    state: z.literal('recovery_required'),
    revision: z.number().int().nonnegative(),
    mode: z.enum(['focus', 'shortBreak', 'longBreak']),
    currentCycleCount: z.number().int().min(1),
    nextSuggestedMode: z.enum(['focus', 'shortBreak', 'longBreak']),
    persistenceHealth: z.enum(['healthy', 'degraded', 'unavailable']),
    workspaceId: z.string().optional(),
    quarantineKey: z.string().optional(),
    failureReason: z.string().min(1),
    detectedAt: z.number().int().positive(),
  }),
]);

export interface OutboxSessionEntry {
  sessionId: string;
  type: PomodoroMode;
  durationMinutes: number; // planned duration
  startedAt: number;
  completedAt: number;
  workspaceId?: string;
  category?: string;
  retryCount: number;
  nextRetryAt: number;
  firstAttemptAt: number;
  lastAttemptAt?: number;
  lastError?: string;
}

export const OutboxSessionEntrySchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['focus', 'shortBreak', 'longBreak']),
  durationMinutes: z.number().int().positive(),
  startedAt: z.number().int().positive(),
  completedAt: z.number().int().positive(),
  workspaceId: z.string().optional(),
  category: z.string().optional(),
  retryCount: z.number().int().nonnegative().default(0),
  nextRetryAt: z.number().int().positive(),
  firstAttemptAt: z.number().int().positive(),
  lastAttemptAt: z.number().int().positive().optional(),
  lastError: z.string().max(300).optional(),
});

export interface DeadLetterSessionEntry extends OutboxSessionEntry {
  transferredAt: number;
  originalFailureReason: string;
  status: 'pending' | 'conflict';
}

export const DeadLetterSessionEntrySchema = OutboxSessionEntrySchema.extend({
  transferredAt: z.number().int().positive(),
  originalFailureReason: z.string().max(300),
  status: z.enum(['pending', 'conflict']).default('pending'),
});

export interface ProcessedCommandRecord {
  commandId: string;
  command: string;
  processedAt: number;
  resultingRevision: number;
}

export const ProcessedCommandRecordSchema = z.object({
  commandId: z.string().min(1),
  command: z.string().min(1),
  processedAt: z.number().int().positive(),
  resultingRevision: z.number().int().nonnegative(),
});

export interface PomodoroStorageEnvelope {
  schemaVersion: 1;
  activeTimerState: ActiveTimerState;
  pendingOutbox: OutboxSessionEntry[];
  recentCommands: ProcessedCommandRecord[];
  config: PomodoroModeConfig;
  lastSavedAt: number;
}

export const PomodoroStorageEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  activeTimerState: ActiveTimerStateSchema,
  pendingOutbox: z.array(OutboxSessionEntrySchema),
  recentCommands: z.array(ProcessedCommandRecordSchema),
  config: PomodoroModeConfigSchema.default(DEFAULT_POMODORO_CONFIG),
  lastSavedAt: z.number().int().positive(),
});

export interface PomodoroRecoveryMarker {
  schemaVersion: 1;
  isRecoveryRequired: true;
  quarantineKey?: string;
  failureReason: string;
  detectedAt: number;
}

export const PomodoroRecoveryMarkerSchema = z.object({
  schemaVersion: z.literal(1),
  isRecoveryRequired: z.literal(true),
  quarantineKey: z.string().optional(),
  failureReason: z.string().min(1),
  detectedAt: z.number().int().positive(),
});

// UI to Background Commands
export type PomodoroCommandType =
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'CANCEL'
  | 'RESET'
  | 'SKIP'
  | 'SWITCH_MODE'
  | 'UPDATE_CONFIG'
  | 'GET_STATE';

export interface PomodoroCommandMessage {
  type: 'POMODORO_COMMAND';
  commandId: string;
  command: PomodoroCommandType;
  expectedRevision?: number; // mandatory for state mutations
  payload?: {
    mode?: PomodoroMode;
    workspaceId?: string;
    customDurationMinutes?: number;
    userConfirmed?: boolean;
    config?: Partial<PomodoroModeConfig>;
  };
  clientTimestamp: number;
}

export const PomodoroCommandMessageSchema = z.object({
  type: z.literal('POMODORO_COMMAND'),
  commandId: z.string().min(1),
  command: z.enum([
    'START',
    'PAUSE',
    'RESUME',
    'CANCEL',
    'RESET',
    'SKIP',
    'SWITCH_MODE',
    'UPDATE_CONFIG',
    'GET_STATE',
  ]),
  expectedRevision: z.number().int().nonnegative().optional(),
  payload: z
    .object({
      mode: z.enum(['focus', 'shortBreak', 'longBreak']).optional(),
      workspaceId: z.string().optional(),
      customDurationMinutes: z.number().int().positive().optional(),
      userConfirmed: z.boolean().optional(),
      config: PomodoroModeConfigSchema.partial().optional(),
    })
    .optional(),
  clientTimestamp: z.number().int().positive(),
});

export interface PomodoroCommandResult {
  success: boolean;
  state?: ActiveTimerState;
  envelope?: PomodoroStorageEnvelope;
  error?: string;
  code?: string;
  duplicated?: boolean;
}
