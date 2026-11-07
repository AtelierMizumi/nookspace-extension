import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NookSpaceDB } from '@/services/database/db';
import { TodoRepository, STORAGE_KEY_TODO_LAST_UPDATED_AT } from '@/services/database/repositories/todoRepository';
import { browserApi } from '@/services/browser';

describe('TodoRepository — Milestone 5.1', () => {
  let db: NookSpaceDB;
  let repo: TodoRepository;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.todos.clear();
    repo = new TodoRepository(db);
  });

  it('1. creates and retrieves a task with default values', async () => {
    const created = await repo.create({
      workspaceId: 'ws-main',
      title: 'Complete architecture review',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Complete architecture review');
    expect(created.completed).toBe(false);
    expect(created.priority).toBe('medium');
    expect(created.order).toBe(0);

    const items = await repo.getByWorkspace('ws-main');
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(created.id);
  });

  it('2. validates title and rejects empty or oversized title', async () => {
    await expect(
      repo.create({
        title: '   ',
      })
    ).rejects.toThrow();

    await expect(
      repo.create({
        title: 'a'.repeat(301),
      })
    ).rejects.toThrow();
  });

  it('3. updates title, priority, dueDate, and category with strict validation', async () => {
    const created = await repo.create({
      workspaceId: 'ws-main',
      title: 'Original Task',
      priority: 'low',
    });

    const dueMs = Date.now() + 86400000;
    const updated = await repo.update(created.id, {
      title: 'Updated Task',
      priority: 'urgent',
      dueDate: dueMs,
      category: 'Work',
    });

    expect(updated.title).toBe('Updated Task');
    expect(updated.priority).toBe('urgent');
    expect(updated.dueDate).toBe(dueMs);
    expect(updated.category).toBe('Work');

    const inDb = await repo.getById(created.id);
    expect(inDb?.title).toBe('Updated Task');
  });

  it('4. workspace isolation: rejects update or deletion from mismatched workspace', async () => {
    const created = await repo.create({
      workspaceId: 'ws-secure',
      title: 'Confidential Task',
    });

    await expect(
      repo.update(created.id, { title: 'Hacked Task' }, 'ws-attacker')
    ).rejects.toThrow(/Workspace Isolation Violation/);

    await expect(
      repo.delete(created.id, 'ws-attacker')
    ).rejects.toThrow(/Workspace Isolation Violation/);

    const intact = await repo.getById(created.id);
    expect(intact?.title).toBe('Confidential Task');
  });

  it('5. toggles and sets completion status', async () => {
    const created = await repo.create({
      workspaceId: 'ws-main',
      title: 'Toggle Task',
    });

    const completedEntity = await repo.setCompleted(created.id, true);
    expect(completedEntity.completed).toBe(true);

    const item = await repo.getById(created.id);
    expect(item?.completed).toBe(true);
  });

  it('6. filters tasks by completed status, category, priority, and search query', async () => {
    await repo.create({ workspaceId: 'ws-filter', title: 'Write unit tests', completed: false, category: 'Dev', priority: 'high' });
    await repo.create({ workspaceId: 'ws-filter', title: 'Review pull request', completed: true, category: 'Dev', priority: 'low' });
    await repo.create({ workspaceId: 'ws-filter', title: 'Buy groceries', completed: false, category: 'Personal', priority: 'medium' });

    const activeTasks = await repo.getByFilter('ws-filter', { completed: false });
    expect(activeTasks).toHaveLength(2);

    const devTasks = await repo.getByFilter('ws-filter', { category: 'Dev' });
    expect(devTasks).toHaveLength(2);

    const searchResults = await repo.getByFilter('ws-filter', { searchQuery: 'groceries' });
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].title).toBe('Buy groceries');
  });

  it('7. filters tasks by date and todayOnly', async () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const todayMs = now.getTime();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const tomorrowMs = tomorrow.getTime();

    await repo.create({ workspaceId: 'ws-date', title: 'Today Task', dueDate: todayMs });
    await repo.create({ workspaceId: 'ws-date', title: 'Tomorrow Task', dueDate: tomorrowMs });

    const todayTasks = await repo.getByFilter('ws-date', { todayOnly: true });
    expect(todayTasks).toHaveLength(1);
    expect(todayTasks[0].title).toBe('Today Task');

    const byDateTasks = await repo.getByDate('ws-date', tomorrowMs);
    expect(byDateTasks).toHaveLength(1);
    expect(byDateTasks[0].title).toBe('Tomorrow Task');
  });

  it('8. deletes a task and clears all completed tasks in workspace', async () => {
    const t1 = await repo.create({ workspaceId: 'ws-del', title: 'Task A', completed: true });
    const t2 = await repo.create({ workspaceId: 'ws-del', title: 'Task B', completed: true });
    const t3 = await repo.create({ workspaceId: 'ws-del', title: 'Task C', completed: false });

    await repo.delete(t3.id, 'ws-del');
    let remaining = await repo.getByWorkspace('ws-del');
    expect(remaining).toHaveLength(2);

    const clearedCount = await repo.clearCompleted('ws-del');
    expect(clearedCount).toBe(2);

    remaining = await repo.getByWorkspace('ws-del');
    expect(remaining).toHaveLength(0);
  });

  it('9. reorders tasks atomically with workspace safety', async () => {
    const t1 = await repo.create({ workspaceId: 'ws-ord', title: 'First' });
    const t2 = await repo.create({ workspaceId: 'ws-ord', title: 'Second' });
    const t3 = await repo.create({ workspaceId: 'ws-ord', title: 'Third' });

    // Reverse order
    await repo.reorder('ws-ord', [t3.id, t2.id, t1.id]);

    const ordered = await repo.getByWorkspace('ws-ord');
    expect(ordered[0].id).toBe(t3.id);
    expect(ordered[1].id).toBe(t2.id);
    expect(ordered[2].id).toBe(t1.id);
  });

  it('10. setCompleted records completedAt timestamp and clears it upon reopening', async () => {
    const beforeTime = Date.now() - 10;
    const task = await repo.create({ workspaceId: 'ws-main', title: 'Timestamp Task' });
    expect(task.completedAt).toBeUndefined();

    // Mark completed
    const completed = await repo.setCompleted(task.id, true);
    expect(completed.completed).toBe(true);
    expect(completed.completedAt).toBeDefined();
    expect(completed.completedAt).toBeGreaterThanOrEqual(beforeTime);

    // Reopen task
    const reopened = await repo.setCompleted(task.id, false);
    expect(reopened.completed).toBe(false);
    expect(reopened.completedAt).toBeUndefined();
  });

  it('11. Failed persistence does not trigger successful storage update signal', async () => {
    const storageSpy = vi.spyOn(browserApi.storage.local, 'set');
    storageSpy.mockClear();

    // Attempt invalid create (title empty)
    await expect(repo.create({ title: '   ' })).rejects.toThrow();

    // Signal must NOT be dispatched
    expect(storageSpy).not.toHaveBeenCalled();

    // Attempt invalid update on non-existent task
    await expect(repo.update('non-existent-id', { title: 'New Title' })).rejects.toThrow();
    expect(storageSpy).not.toHaveBeenCalled();

    storageSpy.mockRestore();
  });
});
