import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '@/services/database/db';
import { migrateLegacyTodos } from '@/services/database/migrations/legacyTodoMigration';
import { ensureTodoMigration, _resetMigrationCoordinatorForTesting } from '@/services/database/migrations/migrationCoordinator';
import { WidgetInstanceEntity } from '@/types/database';

describe('Legacy Todo Data Migration & Coordinator — Milestone 5.2', () => {
  let db: NookSpaceDB;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.widgetInstances.clear();
    await db.todos.clear();
    _resetMigrationCoordinatorForTesting();
  });

  it('1. migrates legacy tasks from multiple SimpleTodoWidget instances accurately with completed status', async () => {
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
    expect(result.status).toBe('completed');
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
    expect((updatedInst1?.config as any)?.migrationStatus).toBe('completed');
    expect((updatedInst1?.config as any)?.migratedToTodosTable).toBe(true);
    // config.tasks MUST still be preserved as backup
    expect((updatedInst1?.config as any)?.tasks).toHaveLength(2);
  });

  it('2. distinguishes "partial" status when invalid tasks are present and does not drop data', async () => {
    const invalidInst: WidgetInstanceEntity = {
      id: 'wi-partial',
      workspaceId: 'ws-partial',
      widgetType: 'simple-todo',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        tasks: [
          { id: 'good-task', title: 'Valid Clean Task', completed: false },
          { id: 'bad-task', title: '   ', completed: false }, // Invalid empty title
        ],
      },
    };

    await db.widgetInstances.add(invalidInst);

    const result = await migrateLegacyTodos(db);
    expect(result.status).toBe('partial');
    expect(result.tasksMigrated).toBe(1);
    expect(result.tasksSkipped).toBe(1);
    expect(result.instanceStatuses[0].status).toBe('partial');

    // Verify valid task was inserted
    const todos = await db.todos.toArray();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Valid Clean Task');

    // Verify instance is NOT marked as completed so remaining tasks can be retried
    const updatedInst = await db.widgetInstances.get('wi-partial');
    expect((updatedInst?.config as any)?.migrationStatus).toBe('partial');
    expect((updatedInst?.config as any)?.migratedToTodosTable).toBe(false);
    expect((updatedInst?.config as any)?.migrationErrors).toHaveLength(1);
    // Source tasks intact
    expect((updatedInst?.config as any)?.tasks).toHaveLength(2);
  });

  it('3. idempotency: running migration a second time does not duplicate tasks', async () => {
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

  it('4. migration coordinator deduplicates concurrent calls and runs safely', async () => {
    const inst: WidgetInstanceEntity = {
      id: 'wi-coord',
      workspaceId: 'ws-coord',
      widgetType: 'simple-todo',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        tasks: [
          { id: 't-coord', title: 'Concurrent Task', completed: false },
        ],
      },
    };

    await db.widgetInstances.add(inst);

    // Trigger concurrent migration calls
    const [res1, res2] = await Promise.all([
      ensureTodoMigration(db),
      ensureTodoMigration(db),
    ]);

    expect(res1.tasksMigrated).toBe(1);
    expect(res2.tasksMigrated).toBe(1); // Same promise result returned

    const todos = await db.todos.toArray();
    expect(todos).toHaveLength(1);
  });
});
