import { defineBackground } from 'wxt/sandbox';
import { pomodoroCoordinator } from '../src/features/pomodoro/coordinator';
import { PomodoroCommandMessageSchema } from '../src/types/pomodoro';

export default defineBackground(() => {
  // 1. Startup Recovery
  pomodoroCoordinator.handleStartupRecovery().catch((err) => {
    console.error('[Background] Pomodoro startup recovery error:', err);
  });

  // 2. Alarm Listener
  const handleAlarmEvent = (alarm: { name: string; scheduledTime?: number }) => {
    if (alarm.name.startsWith('nookspace-pomodoro-timer__')) {
      pomodoroCoordinator.handleAlarm(alarm).catch((err) => {
        console.error('[Background] Alarm handling error:', err);
      });
    }
  };

  if (typeof browser !== 'undefined' && browser.alarms?.onAlarm) {
    browser.alarms.onAlarm.addListener(handleAlarmEvent);
  } else if (typeof chrome !== 'undefined' && chrome.alarms?.onAlarm) {
    chrome.alarms.onAlarm.addListener(handleAlarmEvent);
  }

  // 3. Runtime Message Listener for UI Commands
  const handleMessage = (
    message: unknown,
    _sender: unknown,
    sendResponse: (response: unknown) => void
  ) => {
    if (
      typeof message === 'object' &&
      message !== null &&
      (message as any).type === 'POMODORO_COMMAND'
    ) {
      const parsed = PomodoroCommandMessageSchema.safeParse(message);
      if (!parsed.success) {
        sendResponse({
          success: false,
          code: 'INVALID_COMMAND_SCHEMA',
          error: parsed.error.message,
        });
        return false;
      }

      pomodoroCoordinator
        .handleCommand(parsed.data)
        .then((result) => {
          sendResponse(result);
        })
        .catch((err) => {
          sendResponse({
            success: false,
            code: 'INTERNAL_COORDINATOR_ERROR',
            error: err?.message || String(err),
          });
        });

      return true; // Keep message channel open for async response
    }
    return false;
  };

  if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
    browser.runtime.onMessage.addListener(handleMessage as any);
  } else if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(handleMessage as any);
  }
});
