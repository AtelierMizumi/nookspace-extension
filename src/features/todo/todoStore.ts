import { create } from 'zustand';
import { todoRepo, TodoPriority, TodoCreateInput, TodoUpdateInput } from '../../services/database/repositories/todoRepository';
import { ensureTodoMigration } from '../../services/database/migrations/migrationCoordinator';
import { TodoEntity } from '../../types/database';

export type TodoFilterType = 'all' | 'active' | 'completed' | 'today';

export interface TodoStoreState {
  tasks: TodoEntity[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  activeFilter: TodoFilterType;
  searchQuery: string;
  activeWorkspaceId: string | null;

  // Actions
  initialize: (workspaceId: string) => Promise<void>;
  loadTasks: (workspaceId: string) => Promise<void>;
  setFilter: (filter: TodoFilterType) => void;
  setSearchQuery: (query: string) => void;
  addTask: (
    workspaceId: string,
    title: string,
    options?: { priority?: TodoPriority; dueDate?: number; category?: string }
  ) => Promise<TodoEntity | null>;
  updateTask: (
    id: string,
    updates: TodoUpdateInput,
    workspaceId: string
  ) => Promise<boolean>;
  toggleTask: (id: string, workspaceId: string) => Promise<boolean>;
  deleteTask: (id: string, workspaceId: string) => Promise<boolean>;
  reorderTasks: (workspaceId: string, orderedIds: string[]) => Promise<boolean>;
  clearCompleted: (workspaceId: string) => Promise<number>;
}

export const useTodoStore = create<TodoStoreState>((set, get) => ({
  tasks: [],
  status: 'idle',
  error: null,
  activeFilter: 'all',
  searchQuery: '',
  activeWorkspaceId: null,

  initialize: async (workspaceId: string) => {
    // 1. Ensure legacy migration runs safely before initial query
    try {
      await ensureTodoMigration();
    } catch (migErr) {
      console.warn('[todoStore] Legacy migration encountered an issue during initialize:', migErr);
    }

    // 2. Load tasks for the designated workspace
    await get().loadTasks(workspaceId);
  },

  loadTasks: async (workspaceId: string) => {
    set({ status: 'loading', error: null, activeWorkspaceId: workspaceId });
    try {
      const { activeFilter, searchQuery } = get();

      const filterOptions: Parameters<typeof todoRepo.getByFilter>[1] = {};

      if (activeFilter === 'active') {
        filterOptions.completed = false;
      } else if (activeFilter === 'completed') {
        filterOptions.completed = true;
      } else if (activeFilter === 'today') {
        filterOptions.todayOnly = true;
      }

      if (searchQuery.trim()) {
        filterOptions.searchQuery = searchQuery.trim();
      }

      const items = await todoRepo.getByFilter(workspaceId, filterOptions);

      // Verify that workspaceId has not changed during async fetch
      if (get().activeWorkspaceId === workspaceId) {
        set({ tasks: items, status: 'success', error: null });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks';
      set({ status: 'error', error: msg });
    }
  },

  setFilter: (filter: TodoFilterType) => {
    set({ activeFilter: filter });
    const currentWorkspaceId = get().activeWorkspaceId;
    if (currentWorkspaceId) {
      get().loadTasks(currentWorkspaceId);
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    const currentWorkspaceId = get().activeWorkspaceId;
    if (currentWorkspaceId) {
      get().loadTasks(currentWorkspaceId);
    }
  },

  addTask: async (workspaceId: string, title: string, options) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;

    try {
      const createInput: TodoCreateInput = {
        workspaceId,
        title: trimmedTitle,
        priority: options?.priority || 'medium',
        dueDate: options?.dueDate,
        category: options?.category,
        completed: false,
      };

      const created = await todoRepo.create(createInput);

      // Reload tasks to reflect proper ordering and active filters
      await get().loadTasks(workspaceId);
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add task';
      set({ error: msg });
      return null;
    }
  },

  updateTask: async (id: string, updates: TodoUpdateInput, workspaceId: string) => {
    try {
      await todoRepo.update(id, updates, workspaceId);
      await get().loadTasks(workspaceId);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update task';
      set({ error: msg });
      return false;
    }
  },

  toggleTask: async (id: string, workspaceId: string) => {
    try {
      const existing = get().tasks.find((t) => t.id === id);
      const nextStatus = existing ? !existing.completed : true;

      await todoRepo.setCompleted(id, nextStatus, workspaceId);
      await get().loadTasks(workspaceId);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle task';
      set({ error: msg });
      return false;
    }
  },

  deleteTask: async (id: string, workspaceId: string) => {
    try {
      await todoRepo.delete(id, workspaceId);
      await get().loadTasks(workspaceId);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete task';
      set({ error: msg });
      return false;
    }
  },

  reorderTasks: async (workspaceId: string, orderedIds: string[]) => {
    try {
      await todoRepo.reorder(workspaceId, orderedIds);
      await get().loadTasks(workspaceId);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reorder tasks';
      set({ error: msg });
      return false;
    }
  },

  clearCompleted: async (workspaceId: string) => {
    try {
      const count = await todoRepo.clearCompleted(workspaceId);
      await get().loadTasks(workspaceId);
      return count;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to clear completed tasks';
      set({ error: msg });
      return 0;
    }
  },
}));
