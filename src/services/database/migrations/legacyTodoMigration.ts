import { NookSpaceDB, db } from '../db';
import { TodoEntity } from '../../../types/database';
import { TodoEntitySchema } from '../repositories/todoRepository';

export interface LegacyTaskItem {
  id: string;
  title: string;
  completed?: boolean;
}

export type MigrationStatusCode = 'completed' | 'partial' | 'failed';

export interface LegacyTodoConfig {
  tasks?: LegacyTaskItem[];
  migratedToTodosTable?: boolean;
  migrationStatus?: MigrationStatusCode;
  migratedAt?: number;
  migrationErrors?: string[];
  [key: string]: unknown;
}

export interface InstanceMigrationStatus {
  instanceId: string;
  workspaceId: string;
  status: MigrationStatusCode;
  tasksMigrated: number;
  tasksSkipped: number;
  errors: string[];
}

export interface MigrationResult {
  instancesProcessed: number;
  tasksMigrated: number;
  tasksSkipped: number;
  alreadyMigratedInstances: number;
  status: MigrationStatusCode;
  instanceStatuses: InstanceMigrationStatus[];
  errors: string[];
}

/**
 * Migrates legacy tasks stored in SimpleTodoWidget (WidgetInstanceEntity.config.tasks)
 * into the dedicated Dexie `todos` table.
 *
 * Guarantees:
 * 1. Atomicity: Runs within Dexie transaction(s).
 * 2. Status Precision: Distinguishes 'completed' (100% migrated), 'partial' (some invalid tasks remained in config), 'failed'.
 * 3. Idempotency: Running multiple times will never duplicate tasks.
 * 4. Data Preservation: Source widget instances and their original config.tasks are NEVER deleted.
 */
export async function migrateLegacyTodos(database: NookSpaceDB = db): Promise<MigrationResult> {
  const result: MigrationResult = {
    instancesProcessed: 0,
    tasksMigrated: 0,
    tasksSkipped: 0,
    alreadyMigratedInstances: 0,
    status: 'completed',
    instanceStatuses: [],
    errors: [],
  };

  try {
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

        // If previously verified as fully completed, skip
        if (config.migrationStatus === 'completed' || config.migratedToTodosTable === true) {
          result.alreadyMigratedInstances += 1;
          result.instanceStatuses.push({
            instanceId: instance.id,
            workspaceId: instance.workspaceId,
            status: 'completed',
            tasksMigrated: 0,
            tasksSkipped: 0,
            errors: [],
          });
          continue;
        }

        const tasks = config.tasks;
        const instanceStatus: InstanceMigrationStatus = {
          instanceId: instance.id,
          workspaceId: instance.workspaceId,
          status: 'completed',
          tasksMigrated: 0,
          tasksSkipped: 0,
          errors: [],
        };

        if (!Array.isArray(tasks) || tasks.length === 0) {
          // Zero tasks to migrate -> mark as completed
          await database.widgetInstances.update(instance.id, {
            config: {
              ...config,
              migratedToTodosTable: true,
              migrationStatus: 'completed',
              migratedAt: Date.now(),
              migrationErrors: [],
            },
            updatedAt: Date.now(),
          });
          result.instanceStatuses.push(instanceStatus);
          continue;
        }

        const now = Date.now();
        const todosToInsert: TodoEntity[] = [];

        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];

          // Validate basic task integrity
          if (!task || typeof task.title !== 'string' || !task.title.trim()) {
            instanceStatus.tasksSkipped += 1;
            instanceStatus.errors.push(`Task index ${i} is missing a valid title`);
            continue;
          }

          const cleanTitle = task.title.trim();
          const deterministicId = `todo-migrated-${instance.id}-${task.id || i}`;

          // Check if already migrated in a previous partial run
          const alreadyExists = await database.todos.get(deterministicId);
          if (alreadyExists) {
            // Already safely in database
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

          const validation = TodoEntitySchema.safeParse(newTodo);
          if (!validation.success) {
            instanceStatus.tasksSkipped += 1;
            instanceStatus.errors.push(`Validation failed for task "${task.title}": ${validation.error.message}`);
            continue;
          }

          todosToInsert.push(newTodo);
        }

        if (todosToInsert.length > 0) {
          await database.todos.bulkPut(todosToInsert);
          instanceStatus.tasksMigrated += todosToInsert.length;
          result.tasksMigrated += todosToInsert.length;
        }

        result.tasksSkipped += instanceStatus.tasksSkipped;

        // Determine final instance status: if any task was skipped, it's 'partial', not 'completed'
        if (instanceStatus.tasksSkipped > 0) {
          instanceStatus.status = 'partial';
          result.status = 'partial';
          result.errors.push(...instanceStatus.errors);
        } else {
          instanceStatus.status = 'completed';
        }

        // Update instance config: keep original config.tasks intact as backup!
        await database.widgetInstances.update(instance.id, {
          config: {
            ...config,
            migratedToTodosTable: instanceStatus.status === 'completed',
            migrationStatus: instanceStatus.status,
            migrationErrors: instanceStatus.errors,
            migratedAt: now,
          },
          updatedAt: now,
        });

        result.instanceStatuses.push(instanceStatus);
      }
    });

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.status = 'failed';
    result.errors.push(`Migration transaction failed: ${errorMsg}`);
    return result;
  }
}
