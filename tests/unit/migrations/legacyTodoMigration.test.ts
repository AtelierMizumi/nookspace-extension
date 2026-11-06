import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '@/services/database/db';
import { migrateLegacyTodos } from '@/services/database/migrations/legacyTodoMigration';
import { WidgetInstanceEntity } from '@/types/database';

describe('Legacy Todo Data Migration — Milestone 5.1', () => {
  let db: NookSpaceDB;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.widgetInstances.clear();
    await db.todos.clear();
  });

  it('1. migrates legacy tasks from multiple SimpleTodoWidget instances accurately', async () => {
    const inst1: WidgetInstanceEntity = {
      id: 'wi-todo-1',
      workspaceId: 'ws-alpha',
      widgetType: 'simple-todo',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        tasks: [
          { id: 't1', title: 'Task One', completed: false },
          { id: 't2', title: 'Task Two', completed: true },
        ],
      },
    };

    const inst2: WidgetInstanceEntity = {
      id: 'wi-todo-2',
      workspaceId: 'ws-beta',
      widgetType: 'simple-todo',
      isEnabled: true,
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
      config: {
        tasks: [
          { id: 't3', title: 'Task in Beta', completed: false },
        ],
      },
    };

    await db.widgetInstances.bulkAdd([inst1, inst2]);

    const result = await migrateLegacyTodos(db);
    expect(result.instancesProcessed).toBe(2);
    expect(result.tasksMigrated).toBe(3);
    expect(result.tasksSkipped).toBe(0);

    // Verify records in db.todos
    const alphaTodos = await db.todos.where('workspaceId').equals('ws-alpha').toArray();
    expect(alphaTodos).toHaveLength(2);
    expect(alphaTodos[0].title).toBe('Task One');
    expect(alphaTodos[0].completed).toBe(false);
    expect(alphaTodos[1].title).toBe('Task Two');
    expect(alphaTodos[1].completed).toBe(true);

    const betaTodos = await db.todos.where('workspaceId').equals('ws-beta').toArray();
    expect(betaTodos).toHaveLength(1);
    expect(betaTodos[0].title).toBe('Task in Beta');

    // Verify source widget instances are preserved and marked
    const updatedInst1 = await db.widgetInstances.get('wi-todo-1');
    expect((updatedInst1?.config as any)?.migratedToTodosTable).toBe(true);
    // config.tasks MUST still be preserved as backup
    expect((updatedInst1?.config as any)?.tasks).toHaveLength(2);
  });

  it('2. handles widgets with empty task list or no tasks gracefully', async () => {
    const emptyInst: WidgetInstanceEntity = {
      id: 'wi-empty',
      workspaceId: 'ws-empty',
      widgetType: 'simple-todo',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        tasks: [],
      },
    };

    await db.widgetInstances.add(emptyInst);

    const result = await migrateLegacyTodos(db);
    expect(result.instancesProcessed).toBe(1);
    expect(result.tasksMigrated).toBe(0);
    expect(result.tasksSkipped).toBe(0);

    const todos = await db.todos.toArray();
    expect(todos).toHaveLength(0);

    const updated = await db.widgetInstances.get('wi-empty');
    expect((updated?.config as any)?.migratedToTodosTable).toBe(true);
  });

  it('3. skips invalid or empty task titles without crashing', async () => {
    const invalidInst: WidgetInstanceEntity = {
      id: 'wi-invalid',
      workspaceId: 'ws-main',
      widgetType: 'simple-todo',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        tasks: [
          { id: 'valid1', title: 'Valid Task', completed: false },
          { id: 'inv1', title: '   ', completed: false }, // empty string
          { id: 'inv2', title: 123 as any, completed: false }, // not string
        ],
      },
    };

    await db.widgetInstances.add(invalidInst);

    const result = await migrateLegacyTodos(db);
    expect(result.tasksMigrated).toBe(1);
    expect(result.tasksSkipped).toBe(2);

    const todos = await db.todos.toArray();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Valid Task');
  });

  it('4. idempotency: running migration a second time does not duplicate tasks', async () => {
    const inst: WidgetInstanceEntity = {
      id: 'wi-idem',
      workspaceId: 'ws-idem',
      widgetType: 'simple-todo',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        tasks: [
          { id: 't1', title: 'Idempotent Task', completed: false },
        ],
      },
    };

    await db.widgetInstances.add(inst);

    // Run 1
    const result1 = await migrateLegacyTodos(db);
    expect(result1.tasksMigrated).toBe(1);
    expect(result1.alreadyMigratedInstances).toBe(0);

    // Run 2
    const result2 = await migrateLegacyTodos(db);
    expect(result2.tasksMigrated).toBe(0);
    expect(result2.alreadyMigratedInstances).toBe(1);

    const todos = await db.todos.toArray();
    expect(todos).toHaveLength(1);
  });

  it('5. returns early if no simple-todo instances exist', async () => {
    const clockInst: WidgetInstanceEntity = {
      id: 'wi-clock',
      workspaceId: 'ws-main',
      widgetType: 'clock',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {},
    };

    await db.widgetInstances.add(clockInst);

    const result = await migrateLegacyTodos(db);
    expect(result.instancesProcessed).toBe(0);
    expect(result.tasksMigrated).toBe(0);
  });
});
