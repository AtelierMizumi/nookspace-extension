import { create } from 'zustand';
import {
  ActiveTimerState,
  PomodoroModeConfig,
  DEFAULT_POMODORO_CONFIG,
  PomodoroCommandType,
  PomodoroMode,
  PersistenceHealth,
} from '../../types/pomodoro';
import { browserApi } from '../../services/browser';

export interface PomodoroStoreState {
  // Authoritative State from Background
  activeTimerState: ActiveTimerState;
  config: PomodoroModeConfig;
  isLoading: boolean;
  error: string | null;

  // Local Countdown Computed State (driven by RAF or interval)
  displayRemainingSeconds: number;

  // Actions communicating via Runtime Messaging
  hydrateState: () => Promise<void>;
  startTimer: (
    mode?: PomodoroMode,
    customDuration?: number,
    workspaceId?: string
  ) => Promise<boolean>;
  pauseTimer: () => Promise<boolean>;
  resumeTimer: () => Promise<boolean>;
  cancelTimer: () => Promise<boolean>;
  resetTimer: (userConfirmed?: boolean) => Promise<boolean>;
  skipTimer: () => Promise<boolean>;
  switchMode: (mode: PomodoroMode) => Promise<boolean>;
  updateConfig: (newConfig: Partial<PomodoroModeConfig>) => Promise<boolean>;
  tickCountdown: () => void;
  syncFromStorage: (newState: ActiveTimerState, newConfig?: PomodoroModeConfig) => void;
}

export const initialActiveState: ActiveTimerState = {
  state: 'idle',
  revision: 1,
  mode: 'focus',
  currentCycleCount: 1,
  nextSuggestedMode: 'focus',
  persistenceHealth: 'healthy',
};

async function sendCommandToBackground(
  command: PomodoroCommandType,
  expectedRevision?: number,
  payload?: any
): Promise<{ success: boolean; state?: ActiveTimerState; error?: string; code?: string }> {
  const message = {
    type: 'POMODORO_COMMAND',
    commandId: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    command,
    expectedRevision,
    payload,
    clientTimestamp: Date.now(),
  };

  const ext =
    typeof globalThis !== 'undefined'
      ? (globalThis as any).browser?.runtime?.sendMessage
        ? (globalThis as any).browser
        : (globalThis as any).chrome?.runtime?.sendMessage
        ? (globalThis as any).chrome
        : null
      : null;

  if (ext?.runtime?.sendMessage) {
    return new Promise((resolve) => {
      ext.runtime.sendMessage(message, (response: any) => {
        if (ext.runtime?.lastError) {
          resolve({
            success: false,
            code: 'RUNTIME_COMMUNICATION_ERROR',
            error: ext.runtime.lastError.message,
          });
        } else {
          resolve(response || { success: false, error: 'No response from background' });
        }
      });
    });
  }

  // Fallback for non-extension / unit test environments
  return { success: false, error: 'Extension runtime unavailable' };
}

export const usePomodoroStore = create<PomodoroStoreState>((set, get) => ({
  activeTimerState: initialActiveState,
  config: DEFAULT_POMODORO_CONFIG,
  isLoading: false,
  error: null,
  displayRemainingSeconds: DEFAULT_POMODORO_CONFIG.focusDurationMinutes * 60,

  hydrateState: async () => {
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('GET_STATE');
    if (res.success && res.state) {
      const state = res.state;
      let displaySecs = get().displayRemainingSeconds;
      if (state.state === 'running') {
        displaySecs = Math.max(0, Math.round((state.targetEndTime - Date.now()) / 1000));
      } else if (state.state === 'paused') {
        displaySecs = state.remainingSeconds;
      } else if (state.state === 'idle') {
        displaySecs =
          state.mode === 'focus'
            ? get().config.focusDurationMinutes * 60
            : state.mode === 'shortBreak'
            ? get().config.shortBreakDurationMinutes * 60
            : get().config.longBreakDurationMinutes * 60;
      }
      set({
        activeTimerState: state,
        displayRemainingSeconds: displaySecs,
        isLoading: false,
      });
    } else {
      set({ isLoading: false, error: res.error || null });
    }
  },

  startTimer: async (mode, customDuration, workspaceId) => {
    const currentState = get().activeTimerState;
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('START', currentState.revision, {
      mode,
      customDurationMinutes: customDuration,
      workspaceId,
    });
    if (res.success && res.state) {
      set({
        activeTimerState: res.state,
        displayRemainingSeconds:
          res.state.state === 'running'
            ? Math.max(0, Math.round((res.state.targetEndTime - Date.now()) / 1000))
            : get().displayRemainingSeconds,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error || 'Failed to start timer' });
    return false;
  },

  pauseTimer: async () => {
    const currentState = get().activeTimerState;
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('PAUSE', currentState.revision);
    if (res.success && res.state) {
      set({
        activeTimerState: res.state,
        displayRemainingSeconds:
          res.state.state === 'paused' ? res.state.remainingSeconds : get().displayRemainingSeconds,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error || 'Failed to pause timer' });
    return false;
  },

  resumeTimer: async () => {
    const currentState = get().activeTimerState;
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('RESUME', currentState.revision);
    if (res.success && res.state) {
      set({
        activeTimerState: res.state,
        displayRemainingSeconds:
          res.state.state === 'running'
            ? Math.max(0, Math.round((res.state.targetEndTime - Date.now()) / 1000))
            : get().displayRemainingSeconds,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error || 'Failed to resume timer' });
    return false;
  },

  cancelTimer: async () => {
    const currentState = get().activeTimerState;
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('CANCEL', currentState.revision);
    if (res.success && res.state) {
      set({
        activeTimerState: res.state,
        displayRemainingSeconds: get().config.focusDurationMinutes * 60,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error || 'Failed to cancel timer' });
    return false;
  },

  resetTimer: async (userConfirmed) => {
    const currentState = get().activeTimerState;
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('RESET', currentState.revision, { userConfirmed });
    if (res.success && res.state) {
      set({
        activeTimerState: res.state,
        displayRemainingSeconds: get().config.focusDurationMinutes * 60,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error || 'Failed to reset timer' });
    return false;
  },

  skipTimer: async () => {
    const currentState = get().activeTimerState;
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('SKIP', currentState.revision);
    if (res.success && res.state) {
      const mode = res.state.mode;
      const secs =
        mode === 'focus'
          ? get().config.focusDurationMinutes * 60
          : mode === 'shortBreak'
          ? get().config.shortBreakDurationMinutes * 60
          : get().config.longBreakDurationMinutes * 60;
      set({
        activeTimerState: res.state,
        displayRemainingSeconds: secs,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error || 'Failed to skip timer' });
    return false;
  },

  switchMode: async (mode) => {
    const currentState = get().activeTimerState;
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('SWITCH_MODE', currentState.revision, { mode });
    if (res.success && res.state) {
      const secs =
        mode === 'focus'
          ? get().config.focusDurationMinutes * 60
          : mode === 'shortBreak'
          ? get().config.shortBreakDurationMinutes * 60
          : get().config.longBreakDurationMinutes * 60;
      set({
        activeTimerState: res.state,
        displayRemainingSeconds: secs,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error || 'Failed to switch mode' });
    return false;
  },

  updateConfig: async (newConfig) => {
    set({ isLoading: true, error: null });
    const res = await sendCommandToBackground('UPDATE_CONFIG', undefined, { config: newConfig });
    if (res.success) {
      const merged = { ...get().config, ...newConfig };
      set({ config: merged, isLoading: false });
      return true;
    }
    set({ isLoading: false, error: res.error || 'Failed to update config' });
    return false;
  },

  tickCountdown: () => {
    const { activeTimerState } = get();
    if (activeTimerState.state === 'running') {
      const remaining = Math.max(0, Math.round((activeTimerState.targetEndTime - Date.now()) / 1000));
      set({ displayRemainingSeconds: remaining });
      if (remaining === 0) {
        // Will be updated via storage onChanged or alarm completion event
        get().hydrateState();
      }
    }
  },

  syncFromStorage: (newState, newConfig) => {
    // Only update if incoming revision >= current revision
    const currentRev = get().activeTimerState.revision;
    if (newState.revision >= currentRev) {
      let displaySecs = get().displayRemainingSeconds;
      if (newState.state === 'running') {
        displaySecs = Math.max(0, Math.round((newState.targetEndTime - Date.now()) / 1000));
      } else if (newState.state === 'paused') {
        displaySecs = newState.remainingSeconds;
      }
      set({
        activeTimerState: newState,
        config: newConfig || get().config,
        displayRemainingSeconds: displaySecs,
      });
    }
  },
}));
