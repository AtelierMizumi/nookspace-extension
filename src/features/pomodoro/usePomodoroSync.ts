import { useEffect } from 'react';
import { usePomodoroStore } from './pomodoroStore';
import { STORAGE_KEY_ENVELOPE } from './storageService';
import { PomodoroStorageEnvelopeSchema } from '../../types/pomodoro';

/**
 * Hook to keep the UI view synced with background storage.onChanged events
 * and run the RAF/Interval countdown ticker.
 */
export function usePomodoroSync() {
  const hydrateState = usePomodoroStore((s) => s.hydrateState);
  const syncFromStorage = usePomodoroStore((s) => s.syncFromStorage);
  const tickCountdown = usePomodoroStore((s) => s.tickCountdown);
  const timerState = usePomodoroStore((s) => s.activeTimerState);

  // 1. Initial hydration on mount
  useEffect(() => {
    hydrateState();
  }, [hydrateState]);

  // 2. Storage onChanged listener for multi-tab synchronization
  useEffect(() => {
    const ext =
      typeof browser !== 'undefined' && browser.storage?.onChanged
        ? browser
        : typeof chrome !== 'undefined' && chrome.storage?.onChanged
        ? chrome
        : null;

    if (!ext) return;

    const handleStorageChange = (changes: Record<string, any>, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEY_ENVELOPE]) {
        const newValue = changes[STORAGE_KEY_ENVELOPE].newValue;
        if (newValue) {
          const parsed = PomodoroStorageEnvelopeSchema.safeParse(newValue);
          if (parsed.success) {
            syncFromStorage(parsed.data.activeTimerState, parsed.data.config);
          }
        }
      }
    };

    ext.storage.onChanged.addListener(handleStorageChange);
    return () => {
      ext.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [syncFromStorage]);

  // 3. Ticker for UI countdown when running
  useEffect(() => {
    if (timerState.state !== 'running') return;

    const interval = setInterval(() => {
      tickCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.state, tickCountdown]);
}
