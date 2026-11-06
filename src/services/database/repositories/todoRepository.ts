import { z } from 'zod';
import { db, NookSpaceDB } from '../db';
import { TodoEntity } from '../../../types/database';

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type TodoPriority = z.infer<typeof PrioritySchema>;

export const TodoEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  title: z.string().trim().min(1, 'Title cannot be empty').max(300, 'Title cannot exceed 300 characters'),
  description: z.string().max(2000).optional(),
  completed: z.boolean(),
  priority: PrioritySchema,
  dueDate: z.number().int().positive().optional(),
  category: z.string().trim().max(50).optional(),
  order: z.number().int().nonnegative(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const TodoCreateSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  title: z.string().trim().min(1, 'Title cannot be empty').max(300, 'Title cannot exceed 300 characters'),
  description: z.string().max(2000).optional(),
  completed: z.boolean().default(false),
  priority: PrioritySchema.default('medium'),
  dueDate: z.number().int().positive().optional(),
  category: z.string().trim().max(50).optional(),
  order: z.number().int().nonnegative().optional(),
});

export type TodoCreateInput = z.input<typeof TodoCreateSchema>;

export const TodoUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(300, 'Title cannot exceed 300 characters').optional(),
  description: z.string().max(2000).nullable().optional(),
  completed: z.boolean().optional(),
  priority: PrioritySchema.optional(),
  dueDate: z.number().int().positive().nullable().optional(),
  category: z.string().trim().max(50).nullable().optional(),
  order: z.number().int().nonnegative().optional(),
});

export type TodoUpdateInput = z.input<typeof TodoUpdateSchema>;

export const TodoFilterSchema = z.object({
  completed: z.boolean().optional(),
  category: z.string().optional(),
  priority: PrioritySchema.optional(),
  date: z.number().int().positive().optional(),
  todayOnly: z.boolean().optional(),
  searchQuery: z.string().optional(),
});

export type TodoFilterInput = z.input<typeof TodoFilterSchema>;

export class TodoRepository {
  constructor(private database: NookSpaceDB = db) {}

  async getById(id: string): Promise<TodoEntity | undefined> {
    return this.database.todos.get(id);
  }

  async getByWorkspace(workspaceId?: string, options?: TodoFilterInput): Promise<TodoEntity[]> {
    return this.getByFilter(workspaceId, options);
  }

  async getByFilter(workspaceId?: string, filters?: TodoFilterInput): Promise<TodoEntity[]> {
    let collection = workspaceId
      ? this.database.todos.where('workspaceId').equals(workspaceId)
      : this.database.todos.toCollection();

    let items = await collection.sortBy('order');

    if (filters) {
      const validatedFilters = TodoFilterSchema.parse(filters);

      if (typeof validatedFilters.completed === 'boolean') {
        items = items.filter((item) => item.completed === validatedFilters.completed);
      }
      if (validatedFilters.category) {
        items = items.filter((item) => item.category === validatedFilters.category);
      }
      if (validatedFilters.priority) {
        items = items.filter((item) => item.priority === validatedFilters.priority);
      }
      if (validatedFilters.searchQuery) {
        const query = validatedFilters.searchQuery.toLowerCase();
        items = items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query))
        );
      }
      if (validatedFilters.todayOnly) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const startMs = startOfToday.getTime();
        const endMs = endOfToday.getTime();

        items = items.filter((item) => {
          if (!item.dueDate) return false;
          return item.dueDate >= startMs && item.dueDate <= endMs;
        });
      } else if (validatedFilters.date) {
        const targetDate = new Date(validatedFilters.date);
        targetDate.setHours(0, 0, 0, 0);
        const startMs = targetDate.getTime();
        targetDate.setHours(23, 59, 59, 999);
        const endMs = targetDate.getTime();

        items = items.filter((item) => {
          if (!item.dueDate) return false;
          return item.dueDate >= startMs && item.dueDate <= endMs;
        });
      }
    }

    return items;
  }

  async getByDate(workspaceId: string | undefined, date: Date | number): Promise<TodoEntity[]> {
    const timestamp = typeof date === 'number' ? date : date.getTime();
    return this.getByFilter(workspaceId, { date: timestamp });
  }

  async create(input: TodoCreateInput): Promise<TodoEntity> {
    const validated = TodoCreateSchema.parse(input);
    const now = Date.now();
    const id = `todo-${now}-${Math.random().toString(36).substring(2, 7)}`;

    // Order: put at the end of the existing list in this workspace if not specified
    let order = validated.order;
    if (order === undefined) {
      const existing = await this.getByWorkspace(validated.workspaceId);
      order = existing.length;
    }

    const entity: TodoEntity = {
      id,
      workspaceId: validated.workspaceId,
      title: validated.title,
      description: validated.description,
      completed: validated.completed,
      priority: validated.priority,
      dueDate: validated.dueDate,
      category: validated.category,
      order,
      createdAt: now,
      updatedAt: now,
    };

    // Strict validation of created entity before write
    TodoEntitySchema.parse(entity);

    await this.database.todos.add(entity);
    return entity;
  }

  async update(id: string, updates: TodoUpdateInput, expectedWorkspaceId?: string): Promise<TodoEntity> {
    const validated = TodoUpdateSchema.parse(updates);
    const existing = await this.database.todos.get(id);
    if (!existing) throw new Error(`Todo with id "${id}" not found`);

    if (expectedWorkspaceId && existing.workspaceId && existing.workspaceId !== expectedWorkspaceId) {
      throw new Error(`Workspace Isolation Violation: Cannot update todo belonging to workspace "${existing.workspaceId}" from "${expectedWorkspaceId}"`);
    }

    const updatedEntity: TodoEntity = {
      ...existing,
      title: validated.title ?? existing.title,
      description: validated.description === null ? undefined : validated.description ?? existing.description,
      completed: validated.completed ?? existing.completed,
      priority: validated.priority ?? existing.priority,
      dueDate: validated.dueDate === null ? undefined : validated.dueDate ?? existing.dueDate,
      category: validated.category === null ? undefined : validated.category ?? existing.category,
      order: validated.order ?? existing.order,
      updatedAt: Date.now(),
    };

    TodoEntitySchema.parse(updatedEntity);

    await this.database.todos.put(updatedEntity);
    return updatedEntity;
  }

  async setCompleted(id: string, completed: boolean, expectedWorkspaceId?: string): Promise<TodoEntity> {
    return this.update(id, { completed }, expectedWorkspaceId);
  }

  async delete(id: string, expectedWorkspaceId?: string): Promise<void> {
    const existing = await this.database.todos.get(id);
    if (!existing) return;

    if (expectedWorkspaceId && existing.workspaceId && existing.workspaceId !== expectedWorkspaceId) {
      throw new Error(`Workspace Isolation Violation: Cannot delete todo belonging to workspace "${existing.workspaceId}" from "${expectedWorkspaceId}"`);
    }

    await this.database.todos.delete(id);
  }

  async reorder(workspaceId: string | undefined, orderedIds: string[]): Promise<void> {
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new Error('Invalid reorder request: Duplicate IDs detected in orderedIds');
    }

    await this.database.transaction('rw', this.database.todos, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i];
        const existing = await this.database.todos.get(id);
        if (existing) {
          if (workspaceId && existing.workspaceId && existing.workspaceId !== workspaceId) {
            throw new Error(`Workspace Isolation Violation: Cannot reorder todo belonging to workspace "${existing.workspaceId}"`);
          }
          await this.database.todos.update(id, {
            order: i,
            updatedAt: Date.now(),
          });
        }
      }
    });
  }

  async clearCompleted(workspaceId: string): Promise<number> {
    if (!workspaceId || !workspaceId.trim()) {
      throw new Error('Workspace ID is required to clear completed tasks');
    }
    const completedItems = await this.getByWorkspace(workspaceId, { completed: true });
    const ids = completedItems.map((item) => item.id);
    await this.database.todos.bulkDelete(ids);
    return ids.length;
  }
}

export const todoRepo = new TodoRepository();
