import { NookSpaceDB, db } from '../db';
import { TodoEntity } from '../../../types/database';
import { TodoEntitySchema } from '../repositories/todoRepository';

export interface LegacyTaskItem {
  id: string;
  title: string;
  completed?: boolean;
}

export interface LegacyTodoConfig {
  tasks?: LegacyTaskItem[];
  migratedToTodosTable?: boolean;
  migratedAt?: number;
  [key: string]: unknown;
}

export interface MigrationResult {
  instancesProcessed: number;
  tasksMigrated: number;
  tasksSkipped: number;
  alreadyMigratedInstances: number;
  errors: string[];
}

/**
 * Migrates legacy tasks stored in SimpleTodoWidget (WidgetInstanceEntity.config.tasks)
 * into the dedicated Dexie `todos` table.
 *
 * Guarantees:
 * 1. Atomicity: Runs within a single Dexie transaction. Any unexpected failure triggers full rollback.
 * 2. Idempotency: Running multiple times will not create duplicate todos.
 * 3. Data Preservation: Source widget instances and their original config.tasks are preserved.
 */
export async function migrateLegacyTodos(database: NookSpaceDB = db): Promise<MigrationResult> {
  const result: MigrationResult = {
    instancesProcessed: 0,
    tasksMigrated: 0,
    tasksSkipped: 0,
    alreadyMigratedInstances: 0,
    errors: [],
  };

  const widgetInstances = await database.widgetInstances.toArray();
  const todoInstances = widgetInstances.filter(
    (inst) => inst.widgetType === 'simple-todo' || inst.widgetType === 'todo'
  );

  if (todoInstances.length === 0) {
    return result;
  }

  await database.transaction('rw', [database.widgetInstances, database.todos], async () => {
    for (const instance of todoInstances) {
      result.instancesProcessed += 1;
      const config = (instance.config || {}) as LegacyTodoConfig;

      // Check if already migrated
      if (config.migratedToTodosTable) {
        result.alreadyMigratedInstances += 1;
        continue;
      }

      const tasks = config.tasks;
      if (!Array.isArray(tasks) || tasks.length === 0) {
        // Mark as processed even if empty to prevent re-checking
        await database.widgetInstances.update(instance.id, {
          config: {
            ...config,
            migratedToTodosTable: true,
            migratedAt: Date.now(),
          },
          updatedAt: Date.now(),
        });
        continue;
      }

      const now = Date.now();
      const todosToInsert: TodoEntity[] = [];

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Validate basic task integrity
        if (!task || typeof task.title !== 'string' || !task.title.trim()) {
          result.tasksSkipped += 1;
          continue;
        }

        const cleanTitle = task.title.trim();
        const deterministicId = `todo-migrated-${instance.id}-${task.id || i}`;

        // Ensure we do not overwrite or duplicate existing todos
        const alreadyExists = await database.todos.get(deterministicId);
        if (alreadyExists) {
          result.tasksSkipped += 1;
          continue;
        }

        const newTodo: TodoEntity = {
          id: deterministicId,
          workspaceId: instance.workspaceId,
          title: cleanTitle,
          completed: Boolean(task.completed),
          priority: 'medium',
          order: i,
          createdAt: instance.createdAt || now,
          updatedAt: instance.updatedAt || now,
        };

        // Zod validation on entity
        const validation = TodoEntitySchema.safeParse(newTodo);
        if (!validation.success) {
          result.tasksSkipped += 1;
          result.errors.push(`Validation failed for task "${task.title}": ${validation.error.message}`);
          continue;
        }

        todosToInsert.push(newTodo);
      }

      if (todosToInsert.length > 0) {
        await database.todos.bulkPut(todosToInsert);
        result.tasksMigrated += todosToInsert.length;
      }

      // Mark instance as migrated while keeping config.tasks intact as backup
      await database.widgetInstances.update(instance.id, {
        config: {
          ...config,
          migratedToTodosTable: true,
          migratedAt: now,
        },
        updatedAt: now,
      });
    }
  });

  return result;
}
