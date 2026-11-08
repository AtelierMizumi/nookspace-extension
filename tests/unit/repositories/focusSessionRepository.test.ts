import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '@/services/database/db';
import { FocusSessionRepository } from '@/services/database/repositories/focusSessionRepository';

describe('FocusSessionRepository — Milestone 5.1', () => {
  let db: NookSpaceDB;
  let repo: FocusSessionRepository;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.focusSessions.clear();
    repo = new FocusSessionRepository(db);
  });

  it('1. creates and retrieves a focus session', async () => {
    const now = Date.now();
    const created = await repo.create({
      workspaceId: 'ws-pom',
      type: 'pomodoro',
      category: 'Coding',
      durationMinutes: 25,
      startedAt: now - 25 * 60 * 1000,
      completedAt: now,
      completed: true,
    });

    expect(created.id).toBeDefined();
    expect(created.type).toBe('pomodoro');
    expect(created.category).toBe('Coding');
    expect(created.durationMinutes).toBe(25);
    expect(created.completed).toBe(true);

    const items = await repo.getByWorkspace('ws-pom');
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(created.id);
  });

  it('2. validates duration and timestamps (rejects non-positive duration or completedAt < startedAt)', async () => {
    const now = Date.now();

    // Duration <= 0
    await expect(
      repo.create({
        type: 'pomodoro',
        durationMinutes: 0,
        startedAt: now,
        completedAt: now + 1000,
      })
    ).rejects.toThrow();

    // completedAt < startedAt
    await expect(
      repo.create({
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now,
        completedAt: now - 5000,
      })
    ).rejects.toThrow();
  });

  it('3. workspace isolation: prevents updating or completing session from wrong workspace', async () => {
    const now = Date.now();
    const created = await repo.create({
      workspaceId: 'ws-team-a',
      type: 'study',
      durationMinutes: 45,
      startedAt: now - 45 * 60 * 1000,
      completedAt: now,
      completed: false,
    });

    await expect(
      repo.update(created.id, { category: 'Hacked' }, 'ws-team-b')
    ).rejects.toThrow(/Workspace Isolation Violation/);

    await expect(
      repo.completeSession(created.id, now, 'ws-team-b')
    ).rejects.toThrow(/Workspace Isolation Violation/);
  });

  it('4. completeSession is idempotent (prevents duplicate completion)', async () => {
    const now = Date.now();
    const created = await repo.create({
      workspaceId: 'ws-idempotent',
      type: 'pomodoro',
      durationMinutes: 25,
      startedAt: now - 25 * 60 * 1000,
      completedAt: now,
      completed: false,
    });

    const firstComplete = await repo.completeSession(created.id, now + 1000);
    expect(firstComplete.completed).toBe(true);
    expect(firstComplete.completedAt).toBe(now + 1000);

    // Call again with different timestamp
    const secondComplete = await repo.completeSession(created.id, now + 99999);
    // Should NOT change completedAt because it was already completed
    expect(secondComplete.completedAt).toBe(now + 1000);
  });

  it('5. queries sessions by date range and returns only completed sessions', async () => {
    const base = new Date('2026-11-01T10:00:00Z').getTime();

    // Day 1: 1 completed, 1 abandoned
    await repo.create({
      workspaceId: 'ws-stats',
      type: 'pomodoro',
      durationMinutes: 25,
      startedAt: base,
      completedAt: base + 25 * 60 * 1000,
      completed: true,
    });
    await repo.create({
      workspaceId: 'ws-stats',
      type: 'pomodoro',
      durationMinutes: 10,
      startedAt: base + 30 * 60 * 1000,
      completedAt: base + 40 * 60 * 1000,
      completed: false,
    });

    // Day 2
    const day2 = base + 24 * 3600 * 1000;
    await repo.create({
      workspaceId: 'ws-stats',
      type: 'study',
      category: 'Math',
      durationMinutes: 60,
      startedAt: day2,
      completedAt: day2 + 60 * 60 * 1000,
      completed: true,
    });

    const day1Sessions = await repo.getByDateRange('ws-stats', base, base + 2 * 3600 * 1000);
    expect(day1Sessions).toHaveLength(2);

    const completedDay1 = await repo.getCompletedSessions('ws-stats', base, base + 2 * 3600 * 1000);
    expect(completedDay1).toHaveLength(1);
    expect(completedDay1[0].completed).toBe(true);
  });

  it('6. calculates getTodayStats accurately with category breakdown', async () => {
    const startOfToday = new Date();
    startOfToday.setHours(12, 0, 0, 0);
    const now = startOfToday.getTime();

    await repo.create({
      workspaceId: 'ws-today',
      type: 'pomodoro',
      category: 'Coding',
      durationMinutes: 25,
      startedAt: now - 3600 * 1000,
      completedAt: now - (3600 - 1500) * 1000,
      completed: true,
    });

    await repo.create({
      workspaceId: 'ws-today',
      type: 'pomodoro',
      category: 'Coding',
      durationMinutes: 25,
      startedAt: now - 1800 * 1000,
      completedAt: now - 300 * 1000,
      completed: true,
    });

    await repo.create({
      workspaceId: 'ws-today',
      type: 'short_break',
      durationMinutes: 5,
      startedAt: now - 250 * 1000,
      completedAt: now,
      completed: true,
    });

    const stats = await repo.getTodayStats('ws-today');
    expect(stats.totalSessions).toBe(3);
    expect(stats.totalMinutes).toBe(55);
    expect(stats.pomodorosCompleted).toBe(2);
    expect(stats.breakMinutes).toBe(5);
    expect(stats.categoryBreakdown['Coding']).toBe(50);
  });

  it('7. deletes session and clears history', async () => {
    const now = Date.now();
    const s1 = await repo.create({
      workspaceId: 'ws-clear',
      type: 'pomodoro',
      durationMinutes: 25,
      startedAt: now - 2000,
      completedAt: now,
    });

    await repo.delete(s1.id, 'ws-clear');
    const items = await repo.getByWorkspace('ws-clear');
    expect(items).toHaveLength(0);
  });
});
