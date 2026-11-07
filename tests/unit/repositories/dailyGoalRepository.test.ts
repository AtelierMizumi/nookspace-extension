import { describe, it, expect, beforeEach } from 'vitest';
import { DailyGoalRepository } from '../../../src/services/database/repositories/dailyGoalRepository';
import { DailyGoalEntity } from '../../../src/types/database';

describe('DailyGoalRepository — Milestone 5.5 Database Layer', () => {
  let fakeData: Map<string, DailyGoalEntity>;
  let mockDatabase: any;
  let repo: DailyGoalRepository;

  beforeEach(() => {
    fakeData = new Map();
    mockDatabase = {
      dailyGoals: {
        get: async (id: string) => fakeData.get(id),
        put: async (item: DailyGoalEntity) => {
          fakeData.set(item.id, item);
          return item.id;
        },
        bulkPut: async (items: DailyGoalEntity[]) => {
          for (const item of items) {
            fakeData.set(item.id, item);
          }
        },
        delete: async (id: string) => {
          fakeData.delete(id);
        },
        bulkDelete: async (ids: string[]) => {
          for (const id of ids) {
            fakeData.delete(id);
          }
        },
        where: (field: string) => ({
          equals: (val: any) => ({
            toArray: async () => {
              const all = Array.from(fakeData.values());
              return all.filter((item) => (item as any)[field] === val);
            },
          }),
        }),
      },
    };
    repo = new DailyGoalRepository(mockDatabase);
  });

  it('1. Saves and retrieves a goal by ID', async () => {
    const goal: DailyGoalEntity = {
      id: 'g-1',
      workspaceId: 'ws-test',
      title: 'Daily Focus',
      targetValue: 120,
      currentValue: 30,
      unit: 'mins',
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    };

    await repo.saveGoal(goal);
    const retrieved = await repo.getById('g-1');
    expect(retrieved).toEqual(goal);
  });

  it('2. Enforces Zod validation: rejects non-positive or negative target values', async () => {
    const invalidGoal: any = {
      id: 'g-bad',
      workspaceId: 'ws-test',
      title: 'Invalid Goal',
      targetValue: -10, // Invalid: must be positive
      currentValue: 0,
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    };

    await expect(repo.saveGoal(invalidGoal)).rejects.toThrow();

    const zeroTarget: any = {
      ...invalidGoal,
      targetValue: 0, // Invalid: must be positive (> 0)
    };
    await expect(repo.saveGoal(zeroTarget)).rejects.toThrow();
  });

  it('3. Enforces workspace isolation: retrieves goals filtered strictly by workspaceId', async () => {
    await repo.saveGoal({
      id: 'ws1-goal',
      workspaceId: 'ws-1',
      title: 'WS 1 Goal',
      targetValue: 60,
      currentValue: 10,
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    });

    await repo.saveGoal({
      id: 'ws2-goal',
      workspaceId: 'ws-2',
      title: 'WS 2 Goal',
      targetValue: 90,
      currentValue: 20,
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    });

    await repo.saveGoal({
      id: 'global-goal',
      title: 'Global Goal',
      targetValue: 30,
      currentValue: 5,
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    });

    const ws1Goals = await repo.getGoalsForDate('2026-11-07', 'ws-1');
    expect(ws1Goals.length).toBe(1);
    expect(ws1Goals[0].id).toBe('ws1-goal');

    const ws2Goals = await repo.getGoalsForDate('2026-11-07', 'ws-2');
    expect(ws2Goals.length).toBe(1);
    expect(ws2Goals[0].id).toBe('ws2-goal');

    const globalGoals = await repo.getGoalsForDate('2026-11-07', undefined);
    expect(globalGoals.length).toBe(1);
    expect(globalGoals[0].id).toBe('global-goal');
  });

  it('4. Repeated saves with same ID update existing record without creating duplicates', async () => {
    const goal: DailyGoalEntity = {
      id: 'dg_ws1_2026-11-07_focus_time',
      workspaceId: 'ws-1',
      title: 'Daily Focus Time',
      targetValue: 120,
      currentValue: 25,
      unit: 'mins',
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    };

    await repo.saveGoal(goal);
    // User updates target
    await repo.saveGoal({ ...goal, targetValue: 150, updatedAt: 2000 });

    const all = await repo.getGoalsForDate('2026-11-07', 'ws-1');
    expect(all.length).toBe(1);
    expect(all[0].targetValue).toBe(150);
  });
});
