import { create } from 'zustand';
import { DailyGoalsSummary } from '../../types/dailyGoals';
import { dailyGoalsService, DailyGoalsService } from './dailyGoalsService';

interface DailyGoalsState {
  summary: DailyGoalsSummary | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  activeWorkspaceId: string | undefined;

  // Actions
  setIsEditing: (isEditing: boolean) => void;
  fetchGoals: (workspaceId?: string) => Promise<void>;
  updateTarget: (goalId: string, newTarget: number, workspaceId?: string) => Promise<void>;
  resetToDefaults: (workspaceId?: string) => Promise<void>;
}

let latestRequestId = 0;

export const createDailyGoalsStore = (service: DailyGoalsService = dailyGoalsService) =>
  create<DailyGoalsState>((set, get) => ({
    summary: null,
    isLoading: false,
    error: null,
    isEditing: false,
    activeWorkspaceId: undefined,

    setIsEditing: (isEditing) => set({ isEditing }),

    fetchGoals: async (workspaceId) => {
      const requestId = ++latestRequestId;
      set({ isLoading: true, error: null, activeWorkspaceId: workspaceId });

      try {
        const summary = await service.getDailyGoalsSummary(workspaceId);

        // Guard against stale async responses if workspace switched or a newer fetch occurred
        if (requestId === latestRequestId) {
          set({ summary, isLoading: false, error: null });
        }
      } catch (err: any) {
        if (requestId === latestRequestId) {
          set({
            isLoading: false,
            error: err?.message || 'Failed to load daily goals',
          });
        }
      }
    },

    updateTarget: async (goalId, newTarget, workspaceId) => {
      set({ isLoading: true, error: null });
      try {
        const summary = await service.updateGoalTarget(goalId, newTarget, workspaceId);
        set({ summary, isLoading: false, error: null });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err?.message || 'Failed to update goal target',
        });
        throw err;
      }
    },

    resetToDefaults: async (workspaceId) => {
      set({ isLoading: true, error: null });
      try {
        const summary = await service.resetGoalsToDefaults(workspaceId);
        set({ summary, isLoading: false, error: null });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err?.message || 'Failed to reset daily goals',
        });
      }
    },
  }));

export const useDailyGoalsStore = createDailyGoalsStore();
