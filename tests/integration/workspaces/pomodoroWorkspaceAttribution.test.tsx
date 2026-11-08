import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PomodoroCoordinator } from '../../../src/features/pomodoro/coordinator';
import { StorageService } from '../../../src/features/pomodoro/storageService';
import { OutboxService } from '../../../src/features/pomodoro/outboxService';
import { createMockBrowser } from '../../mocks/browser';
import { STORAGE_KEY_LAST_DRAINED_AT } from '../../../src/features/pomodoro/storageService';
import { FocusSessionEntity } from '../../../src/types/database';
import { PomodoroWidgetComponent } from '../../../src/widgets/PomodoroWidget';
import { usePomodoroStore, initialActiveState } from '../../../src/features/pomodoro/pomodoroStore';
import { createWorkspaceStore } from '../../../src/stores/workspaceStore';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';

describe('Milestone 8.6 — Pomodoro Workspace Attribution & Multi-Tab Isolation Suite', () => {
  let mockBrowser: ReturnType<typeof createMockBrowser>;
  let storage: StorageService;
  let outbox: OutboxService;
  let coordinator: PomodoroCoordinator;
  let fakeDexieSessions: FocusSessionEntity[] = [];

  const mockFocusSessionRepo: any = {
    getById: vi.fn(async (id: string) => fakeDexieSessions.find((s) => s.id === id)),
    create: vi.fn(async (item: any) => {
      const created = { id: item.id || `session_${Date.now()}`, ...item };
      fakeDexieSessions.push(created);
      return created;
    }),
  };

  const wsA = 'ws-session-study';
  const wsB = 'ws-session-coding';

  beforeEach(() => {
    mockBrowser = createMockBrowser();
    (globalThis as any).browser = mockBrowser.mock;
    (globalThis as any).chrome = mockBrowser.mock;

    storage = new StorageService();
    outbox = new OutboxService(mockFocusSessionRepo, storage);
    coordinator = new PomodoroCoordinator(storage, outbox);
    fakeDexieSessions = [];

    usePomodoroStore.setState({
      activeTimerState: { ...initialActiveState },
      isLoading: false,
      error: null,
      displayRemainingSeconds: 25 * 60,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1. Pomodoro started in Workspace A retains its attribution when completed, even if another tab switches to Workspace B', async () => {
    // 1. Tab A starts timer in Workspace A
    const startRes = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-start-ws-a',
      command: 'START',
      expectedRevision: 1,
      payload: {
        mode: 'focus',
        customDurationMinutes: 25,
        workspaceId: wsA,
      },
      clientTimestamp: Date.now(),
    });

    expect(startRes.success).toBe(true);
    expect(startRes.state?.state).toBe('running');
    expect((startRes.state as any).workspaceId).toBe(wsA);

    const sessionId = (startRes.state as any).sessionId;
    const targetEndTime = (startRes.state as any).targetEndTime;

    // 2. Tab B switches active workspace to Workspace B
    const testDb = new NookSpaceDB(`test-pom-ws-${Date.now()}`);
    await testDb.open();
    const workspaceRepo = new WorkspaceRepository(testDb);
    const workspaceStore = createWorkspaceStore({ repo: workspaceRepo, database: testDb });
    await workspaceStore.getState().initWorkspaces();
    await workspaceStore.getState().setActiveWorkspace(wsB);

    expect(workspaceStore.getState().activeWorkspaceId).toBe(wsB);

    // 3. Pomodoro timer finishes in background (alarm fires)
    vi.setSystemTime(targetEndTime + 100);

    await coordinator.handleAlarm({
      name: `nookspace-pomodoro-timer__${sessionId}`,
      scheduledTime: targetEndTime,
    });

    // 4. Verify background state and outbox drain
    const env = await storage.loadEnvelope();
    expect(env.activeTimerState.state).toBe('completed');
    expect((env.activeTimerState as any).workspaceId).toBe(wsA);

    // 5. Verify Dexie FocusSession entity: strictly attributed to Workspace A, NOT Workspace B
    expect(fakeDexieSessions).toHaveLength(1);
    const session = fakeDexieSessions[0];
    expect(session.workspaceId).toBe(wsA);
    expect(session.workspaceId).not.toBe(wsB);
    expect(session.type).toBe('pomodoro');
    expect(session.completed).toBe(true);

    await testDb.delete();
  });

  it('2. PomodoroWidget passes its workspaceId prop when starting a timer', async () => {
    const capturedMessages: any[] = [];
    const mockExtension = {
      runtime: {
        sendMessage: vi.fn((msg, cb) => {
          capturedMessages.push(msg);
          if (cb) {
            cb({
              success: true,
              state: {
                ...initialActiveState,
                state: msg.command === 'START' ? 'running' : 'idle',
                revision: 2,
                sessionId: 'sess-ui-test',
                targetEndTime: Date.now() + 25 * 60 * 1000,
                durationMinutes: 25,
                workspaceId: 'ws-widget-biology',
              },
            });
          }
        }),
      },
      storage: {
        local: {
          get: vi.fn((k, cb) => cb({})),
          set: vi.fn((items, cb) => cb && cb()),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    };

    (globalThis as any).browser = mockExtension;
    (globalThis as any).chrome = mockExtension;

    render(
      <PomodoroWidgetComponent
        instanceId="inst-pom-1"
        workspaceId="ws-widget-biology"
        isEditMode={false}
        config={{}}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
      />
    );

    // Wait for initial mount / hydration to settle
    await waitFor(() => {
      expect(usePomodoroStore.getState().isLoading).toBe(false);
    });

    // Click "Start" button
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      const startCmd = capturedMessages.find((m) => m.command === 'START');
      expect(startCmd).toBeDefined();
    });

    const startCmd = capturedMessages.find((m) => m.command === 'START');
    expect(startCmd.type).toBe('POMODORO_COMMAND');
    expect(startCmd.payload).toBeDefined();
    expect(startCmd.payload.workspaceId).toBe('ws-widget-biology');
  });

  it('3. Next suggested mode completion restart preserves original workspaceId', async () => {
    // 1. Start break in Workspace A
    const startRes = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-start-break',
      command: 'START',
      expectedRevision: 1,
      payload: {
        mode: 'shortBreak',
        customDurationMinutes: 5,
        workspaceId: wsA,
      },
      clientTimestamp: Date.now(),
    });

    expect(startRes.success).toBe(true);
    expect((startRes.state as any).workspaceId).toBe(wsA);

    const sessionId = (startRes.state as any).sessionId;
    const targetEndTime = (startRes.state as any).targetEndTime;

    // Alarm fires completing the break
    vi.setSystemTime(targetEndTime + 100);
    await coordinator.handleAlarm({
      name: `nookspace-pomodoro-timer__${sessionId}`,
      scheduledTime: targetEndTime,
    });

    const env = await storage.loadEnvelope();
    expect(env.activeTimerState.state).toBe('completed');
    expect((env.activeTimerState as any).workspaceId).toBe(wsA);
    expect(fakeDexieSessions.some((s) => s.type === 'short_break' && s.workspaceId === wsA)).toBe(true);
  });
});
