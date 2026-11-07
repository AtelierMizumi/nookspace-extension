import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PomodoroCoordinator } from '../../../src/features/pomodoro/coordinator';
import { StorageService } from '../../../src/features/pomodoro/storageService';
import { OutboxService } from '../../../src/features/pomodoro/outboxService';
import { createMockBrowser } from '../../mocks/browser';
import { DEFAULT_ENVELOPE } from '../../../src/features/pomodoro/storageService';
import { PomodoroStorageEnvelope } from '../../../src/types/pomodoro';

describe('Pomodoro Coordinator & Alarm Lifecycle — Milestone 5.3.2', () => {
  let mockBrowser: ReturnType<typeof createMockBrowser>;
  let storage: StorageService;
  let outbox: OutboxService;
  let coordinator: PomodoroCoordinator;
  let fakeDexieItems: any[] = [];

  const mockSessionRepo: any = {
    getById: vi.fn(async (id: string) => fakeDexieItems.find((i) => i.id === id)),
    create: vi.fn(async (item: any) => {
      fakeDexieItems.push({ id: item.id || `dexie_${Date.now()}`, ...item });
      return item;
    }),
  };

  beforeEach(() => {
    mockBrowser = createMockBrowser();
    (globalThis as any).browser = mockBrowser.mock;
    (globalThis as any).chrome = mockBrowser.mock;

    storage = new StorageService();
    outbox = new OutboxService(mockSessionRepo, storage);
    coordinator = new PomodoroCoordinator(storage, outbox);
    fakeDexieItems = [];
  });

  it('1. Handles START command with optimistic concurrency and creates alarm', async () => {
    const res = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-1',
      command: 'START',
      expectedRevision: 1,
      clientTimestamp: Date.now(),
    });

    expect(res.success).toBe(true);
    expect(res.state?.state).toBe('running');
    expect(res.state?.revision).toBe(2);
    expect(mockBrowser.alarms.size).toBe(1);
    const alarmName = `nookspace-pomodoro-timer__${(res.state as any).sessionId}`;
    expect(mockBrowser.alarms.has(alarmName)).toBe(true);
  });

  it('2. Command deduplication returns identical state without incrementing revision', async () => {
    await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-dup-1',
      command: 'START',
      expectedRevision: 1,
      clientTimestamp: Date.now(),
    });

    const res2 = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-dup-1',
      command: 'START',
      expectedRevision: 1,
      clientTimestamp: Date.now(),
    });

    expect(res2.success).toBe(true);
    expect(res2.duplicated).toBe(true);
    expect(res2.state?.revision).toBe(2);
  });

  it('3. Rejects stale revision command with STALE_REVISION', async () => {
    await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-start',
      command: 'START',
      expectedRevision: 1,
      clientTimestamp: Date.now(),
    });

    // Client sends command with revision 1, but state is now 2
    const staleRes = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-stale',
      command: 'PAUSE',
      expectedRevision: 1,
      clientTimestamp: Date.now(),
    });

    expect(staleRes.success).toBe(false);
    expect(staleRes.code).toBe('STALE_REVISION');
  });

  it('4. Blocker Task FIFO Test: Alarm A processed after CANCEL A and START B', async () => {
    const startRes = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-start-a',
      command: 'START',
      expectedRevision: 1,
      clientTimestamp: Date.now(),
    });
    const sessionAId = (startRes.state as any).sessionId;
    const sessionATarget = (startRes.state as any).targetEndTime;

    // Create Blocker Task
    let releaseBlocker: () => void;
    const blockerPromise = new Promise<void>((resolve) => {
      releaseBlocker = resolve;
    });

    // 1. Enqueue blocker
    const blockerTask = coordinator.queue.enqueue(() => blockerPromise);

    // 2. Enqueue CANCEL A
    const cancelTask = coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-cancel-a',
      command: 'CANCEL',
      expectedRevision: 2,
      clientTimestamp: Date.now(),
    });

    // 3. Enqueue START B
    const startBTask = coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-start-b',
      command: 'START',
      expectedRevision: 3,
      clientTimestamp: Date.now(),
    });

    // 4. Enqueue Alarm A
    const alarmATask = coordinator.handleAlarm({
      name: `nookspace-pomodoro-timer__${sessionAId}`,
      scheduledTime: sessionATarget,
    });

    // Release blocker to process FIFO
    releaseBlocker!();
    const [_, cancelRes, startBRes] = await Promise.all([blockerTask, cancelTask, startBTask, alarmATask]);

    expect(cancelRes.success).toBe(true);
    expect(startBRes.success).toBe(true);
    const finalEnv = await storage.loadEnvelope();
    // Final state must be Session B running!
    expect(finalEnv.activeTimerState.state).toBe('running');
    expect((finalEnv.activeTimerState as any).sessionId).toBe((startBRes.state as any).sessionId);
    // Alarm A must not have created any completion
    expect(finalEnv.pendingOutbox.filter((o) => o.sessionId === sessionAId).length).toBe(0);
  });

  it('5. Stale alarm from same session after Resume is ignored and does NOT cancel new alarm', async () => {
    const startRes = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-s1',
      command: 'START',
      expectedRevision: 1,
      clientTimestamp: Date.now(),
    });
    const sessionId = (startRes.state as any).sessionId;
    const oldTarget = (startRes.state as any).targetEndTime;

    await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-pause',
      command: 'PAUSE',
      expectedRevision: 2,
      clientTimestamp: Date.now(),
    });

    const resumeRes = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-resume',
      command: 'RESUME',
      expectedRevision: 3,
      clientTimestamp: Date.now(),
    });
    const newTarget = (resumeRes.state as any).targetEndTime;

    // Trigger old alarm at oldTarget
    await coordinator.handleAlarm({
      name: `nookspace-pomodoro-timer__${sessionId}`,
      scheduledTime: oldTarget, // Old target != newTarget
    });

    const env = await storage.loadEnvelope();
    expect(env.activeTimerState.state).toBe('running');
    expect((env.activeTimerState as any).targetEndTime).toBe(newTarget);
    // New alarm must still exist!
    expect(mockBrowser.alarms.has(`nookspace-pomodoro-timer__${sessionId}`)).toBe(true);
  });

  it('6. Valid alarm completes session, creates outbox entry and drains into Dexie', async () => {
    const startRes = await coordinator.handleCommand({
      type: 'POMODORO_COMMAND',
      commandId: 'cmd-start-valid',
      command: 'START',
      expectedRevision: 1,
      clientTimestamp: Date.now(),
    });
    const sessionId = (startRes.state as any).sessionId;
    const targetEndTime = (startRes.state as any).targetEndTime;

    // Advance time to targetEndTime
    vi.setSystemTime(targetEndTime + 100);

    await coordinator.handleAlarm({
      name: `nookspace-pomodoro-timer__${sessionId}`,
      scheduledTime: targetEndTime,
    });

    const env = await storage.loadEnvelope();
    expect(env.activeTimerState.state).toBe('completed');
    expect((env.activeTimerState as any).sessionId).toBe(sessionId);
    // Dexie must contain this session
    expect(fakeDexieItems.some((s) => s.type === 'pomodoro')).toBe(true);

    vi.useRealTimers();
  });
});
