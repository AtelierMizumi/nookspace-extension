import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB, db } from '@/services/database/db';
import { useTodoStore } from '@/features/todo/todoStore';
import { _resetMigrationCoordinatorForTesting } from '@/services/database/migrations/migrationCoordinator';

describe('useTodoStore — Milestone 5.2', () => {
  beforeEach(async () => {
    await db.open();
    await db.todos.clear();
    await db.widgetInstances.clear();
    _resetMigrationCoordinatorForTesting();

    // Reset store state
    useTodoStore.setState({
      tasks: [],
      status: 'idle',
      error: null,
      activeFilter: 'all',
      searchQuery: '',
      activeWorkspaceId: null,
    });
  });

  it('1. initialize loads tasks for workspace and sets status to success', async () => {
    // Seed a task directly in db
    await db.todos.add({
      id: 'task-init',
      workspaceId: 'ws-store',
      title: 'Initial Seed Task',
      completed: false,
      priority: 'high',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    await useTodoStore.getState().initialize('ws-store');

    const state = useTodoStore.getState();
    expect(state.status).toBe('success');
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].title).toBe('Initial Seed Task');
    expect(state.activeWorkspaceId).toBe('ws-store');
  });

  it('2. addTask creates task in DB and updates store state', async () => {
    await useTodoStore.getState().initialize('ws-store');

    const created = await useTodoStore.getState().addTask('ws-store', 'Brand New Task', {
      priority: 'urgent',
      category: 'Dev',
    });

    expect(created).not.toBeNull();
    expect(created?.title).toBe('Brand New Task');
    expect(created?.priority).toBe('urgent');

    const state = useTodoStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].id).toBe(created?.id);

    // Verify written to Dexie
    const inDb = await db.todos.get(created!.id);
    expect(inDb?.title).toBe('Brand New Task');
    expect(inDb?.category).toBe('Dev');
  });

  it('3. toggleTask toggles completion status in DB and store', async () => {
    await useTodoStore.getState().initialize('ws-store');
    const created = await useTodoStore.getState().addTask('ws-store', 'Toggleable Task');

    expect(useTodoStore.getState().tasks[0].completed).toBe(false);

    // Toggle to completed
    await useTodoStore.getState().toggleTask(created!.id, 'ws-store');
    expect(useTodoStore.getState().tasks[0].completed).toBe(true);

    const inDb = await db.todos.get(created!.id);
    expect(inDb?.completed).toBe(true);
  });

  it('4. updateTask updates priority and title safely', async () => {
    await useTodoStore.getState().initialize('ws-store');
    const created = await useTodoStore.getState().addTask('ws-store', 'Task to update');

    await useTodoStore.getState().updateTask(
      created!.id,
      { title: 'Updated Title', priority: 'low' },
      'ws-store'
    );

    const inDb = await db.todos.get(created!.id);
    expect(inDb?.title).toBe('Updated Title');
    expect(inDb?.priority).toBe('low');
  });

  it('5. deleteTask removes task from DB and store', async () => {
    await useTodoStore.getState().initialize('ws-store');
    const created = await useTodoStore.getState().addTask('ws-store', 'Task to delete');

    expect(useTodoStore.getState().tasks).toHaveLength(1);

    await useTodoStore.getState().deleteTask(created!.id, 'ws-store');
    expect(useTodoStore.getState().tasks).toHaveLength(0);

    const inDb = await db.todos.get(created!.id);
    expect(inDb).toBeUndefined();
  });

  it('6. setFilter filters between all, active, completed, today', async () => {
    await useTodoStore.getState().initialize('ws-store');
    const t1 = await useTodoStore.getState().addTask('ws-store', 'Active Task');
    const t2 = await useTodoStore.getState().addTask('ws-store', 'Done Task');
    await useTodoStore.getState().toggleTask(t2!.id, 'ws-store');

    // Filter: active
    useTodoStore.getState().setFilter('active');
    // Allow state reload
    await useTodoStore.getState().loadTasks('ws-store');
    expect(useTodoStore.getState().tasks).toHaveLength(1);
    expect(useTodoStore.getState().tasks[0].title).toBe('Active Task');

    // Filter: completed
    useTodoStore.getState().setFilter('completed');
    await useTodoStore.getState().loadTasks('ws-store');
    expect(useTodoStore.getState().tasks).toHaveLength(1);
    expect(useTodoStore.getState().tasks[0].title).toBe('Done Task');

    // Filter: all
    useTodoStore.getState().setFilter('all');
    await useTodoStore.getState().loadTasks('ws-store');
    expect(useTodoStore.getState().tasks).toHaveLength(2);
  });

  it('7. clearCompleted removes all completed tasks in workspace', async () => {
    await useTodoStore.getState().initialize('ws-store');
    await useTodoStore.getState().addTask('ws-store', 'Active 1');
    const d1 = await useTodoStore.getState().addTask('ws-store', 'Done 1');
    const d2 = await useTodoStore.getState().addTask('ws-store', 'Done 2');

    await useTodoStore.getState().toggleTask(d1!.id, 'ws-store');
    await useTodoStore.getState().toggleTask(d2!.id, 'ws-store');

    const cleared = await useTodoStore.getState().clearCompleted('ws-store');
    expect(cleared).toBe(2);

    expect(useTodoStore.getState().tasks).toHaveLength(1);
    expect(useTodoStore.getState().tasks[0].title).toBe('Active 1');
  });

  it('8. workspace switching loads only the targeted workspace tasks', async () => {
    await useTodoStore.getState().initialize('ws-alpha');
    await useTodoStore.getState().addTask('ws-alpha', 'Alpha Task');

    await useTodoStore.getState().initialize('ws-beta');
    await useTodoStore.getState().addTask('ws-beta', 'Beta Task');

    expect(useTodoStore.getState().tasks).toHaveLength(1);
    expect(useTodoStore.getState().tasks[0].title).toBe('Beta Task');

    // Switch back to ws-alpha
    await useTodoStore.getState().loadTasks('ws-alpha');
    expect(useTodoStore.getState().tasks).toHaveLength(1);
    expect(useTodoStore.getState().tasks[0].title).toBe('Alpha Task');
  });
});
