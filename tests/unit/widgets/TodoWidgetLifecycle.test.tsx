import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/services/database/db';
import { todoRepo, STORAGE_KEY_TODO_LAST_UPDATED_AT } from '@/services/database/repositories/todoRepository';
import { widgetInstanceRepo } from '@/services/database/repositories/widgetInstanceRepository';
import { TodoWidgetComponent } from '@/widgets/TodoWidget';
import { useTodoStore } from '@/features/todo/todoStore';
import { _resetMigrationCoordinatorForTesting } from '@/services/database/migrations/migrationCoordinator';

describe('TodoWidget Lifecycle & Data Safety — Milestone 5.2', () => {
  beforeEach(async () => {
    await db.open();
    await db.todos.clear();
    await db.widgetInstances.clear();
    _resetMigrationCoordinatorForTesting();

    useTodoStore.setState({
      tasks: [],
      status: 'idle',
      error: null,
      activeFilter: 'all',
      searchQuery: '',
      activeWorkspaceId: null,
    });
  });

  it('Test A: deleting a Todo widget from dashboard NEVER deletes tasks from Dexie', async () => {
    // 1. Create a widget instance
    const instance = await widgetInstanceRepo.create({
      workspaceId: 'ws-safe',
      widgetType: 'todo',
      title: 'My Daily Tasks',
    });

    // 2. Add tasks in that workspace
    const task1 = await todoRepo.create({
      workspaceId: 'ws-safe',
      title: 'Critical Project Task',
      priority: 'high',
    });
    const task2 = await todoRepo.create({
      workspaceId: 'ws-safe',
      title: 'Secondary Research',
      priority: 'medium',
    });

    // 3. User deletes the widget instance from their Dashboard
    await widgetInstanceRepo.delete(instance.id);
    const instanceAfterDelete = await widgetInstanceRepo.getById(instance.id);
    expect(instanceAfterDelete).toBeUndefined();

    // 4. CRITICAL INVARIANT: The tasks in Dexie todos table MUST remain 100% intact!
    const preservedTasks = await todoRepo.getByWorkspace('ws-safe');
    expect(preservedTasks).toHaveLength(2);
    expect(preservedTasks[0].id).toBe(task1.id);
    expect(preservedTasks[1].id).toBe(task2.id);

    // 5. User adds a new Todo widget instance to their Dashboard later
    const newInstance = await widgetInstanceRepo.create({
      workspaceId: 'ws-safe',
      widgetType: 'todo',
      title: 'Restored Daily Tasks',
    });
    expect(newInstance.id).toBeDefined();

    // 6. When the new widget renders, it re-hydrates the existing tasks seamlessly
    await useTodoStore.getState().initialize('ws-safe');
    expect(useTodoStore.getState().tasks).toHaveLength(2);
    expect(useTodoStore.getState().tasks[0].title).toBe('Critical Project Task');
  });

  it('Test B: strict workspace isolation prevents data leakage between workspaces', async () => {
    // Create tasks in Workspace A
    const taskA = await todoRepo.create({
      workspaceId: 'ws-team-alpha',
      title: 'Alpha Secret Task',
    });

    // Create tasks in Workspace B
    const taskB = await todoRepo.create({
      workspaceId: 'ws-team-beta',
      title: 'Beta Roadmap Task',
    });

    // Query Workspace A
    const tasksA = await todoRepo.getByWorkspace('ws-team-alpha');
    expect(tasksA).toHaveLength(1);
    expect(tasksA[0].id).toBe(taskA.id);

    // Query Workspace B
    const tasksB = await todoRepo.getByWorkspace('ws-team-beta');
    expect(tasksB).toHaveLength(1);
    expect(tasksB[0].id).toBe(taskB.id);

    // Security violation: trying to delete Alpha task using Beta workspace context
    await expect(
      todoRepo.delete(taskA.id, 'ws-team-beta')
    ).rejects.toThrow(/Workspace Isolation Violation/);

    // Security violation: trying to update Alpha task using Beta workspace context
    await expect(
      todoRepo.update(taskA.id, { title: 'Compromised' }, 'ws-team-beta')
    ).rejects.toThrow(/Workspace Isolation Violation/);

    // Verify task A remains intact
    const verifyA = await todoRepo.getById(taskA.id);
    expect(verifyA?.title).toBe('Alpha Secret Task');
  });

  it('Test C & D: interactive widget rendering, quick add, toggle, and filters', async () => {
    // Render widget component
    render(
      <TodoWidgetComponent
        instanceId="inst-ui-test"
        workspaceId="ws-ui"
        isEditMode={false}
        config={{ defaultFilter: 'all' }}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
      />
    );

    // Check header
    expect(screen.getByText('Tasks')).toBeDefined();

    // Quick add task
    const input = screen.getByPlaceholderText('Add task... (Press Enter)');
    fireEvent.change(input, { target: { value: 'Write Comprehensive Tests' } });
    fireEvent.submit(input);

    // Wait for task to appear in DOM
    await waitFor(() => {
      expect(screen.getByText('Write Comprehensive Tests')).toBeDefined();
    });

    // Verify task in Dexie
    const tasks = await todoRepo.getByWorkspace('ws-ui');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Write Comprehensive Tests');
    expect(tasks[0].completed).toBe(false);

    // Toggle task completion
    const checkbox = screen.getByRole('checkbox', { name: /Mark task "Write Comprehensive Tests" as completed/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(useTodoStore.getState().tasks[0].completed).toBe(true);
    });

    // Test filter buttons: Switch to "Active" tab
    const activeFilterBtn = screen.getByRole('button', { name: /Filter by active tasks/i });
    fireEvent.click(activeFilterBtn);

    await waitFor(() => {
      // Completed task should now be filtered out
      expect(screen.queryByText('Write Comprehensive Tests')).toBeNull();
      expect(screen.getByText('No tasks found.')).toBeDefined();
    });

    // Switch to "Completed" tab
    const completedFilterBtn = screen.getByRole('button', { name: /Filter by completed tasks/i });
    fireEvent.click(completedFilterBtn);

    await waitFor(() => {
      // Completed task should be visible again
      expect(screen.getByText('Write Comprehensive Tests')).toBeDefined();
    });
  });

  it('Test E: Live synchronization reloads tasks when STORAGE_KEY_TODO_LAST_UPDATED_AT event arrives', async () => {
    let storageCallback: ((changes: Record<string, any>, areaName: string) => void) | null = null;
    (globalThis as any).browser = {
      storage: {
        onChanged: {
          addListener: (cb: any) => {
            storageCallback = cb;
          },
          removeListener: () => {
            storageCallback = null;
          },
        },
      },
    };

    render(
      <TodoWidgetComponent
        instanceId="inst-sync-test"
        workspaceId="ws-sync"
        isEditMode={false}
        config={{ defaultFilter: 'all' }}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
      />
    );

    // Initial state: empty
    await waitFor(() => {
      expect(screen.getByText('No tasks found.')).toBeDefined();
    });

    // Simulate task added in another tab directly to Dexie
    await todoRepo.create({
      workspaceId: 'ws-sync',
      title: 'Task Created From Other Tab',
      priority: 'high',
      completed: false,
    });

    // Trigger storage event
    expect(storageCallback).toBeDefined();
    storageCallback!({ [STORAGE_KEY_TODO_LAST_UPDATED_AT]: { newValue: Date.now() } }, 'local');

    // Verify task appears in this tab's TodoWidget
    await waitFor(() => {
      expect(screen.getByText('Task Created From Other Tab')).toBeDefined();
    });
  });
});
