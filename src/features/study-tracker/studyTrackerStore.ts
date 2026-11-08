import { create } from 'zustand';
import { StudyTrackerStats, StudyTimeRange } from '../../types/studyTracker';
import { studyTrackerService, StudyTrackerService } from './studyTrackerService';

export interface StudyTrackerStoreState {
  stats: StudyTrackerStats | null;
  timeRange: StudyTimeRange;
  isLoading: boolean;
  error: string | null;

  setTimeRange: (range: StudyTimeRange, workspaceId?: string) => void;
  fetchStats: (workspaceId?: string) => Promise<void>;
}

let latestRequestId = 0;

export const useStudyTrackerStore = create<StudyTrackerStoreState>((set, get) => ({
  stats: null,
  timeRange: '7D',
  isLoading: false,
  error: null,

  setTimeRange: (range, workspaceId) => {
    set({ timeRange: range });
    get().fetchStats(workspaceId);
  },

  fetchStats: async (workspaceId) => {
    const requestId = ++latestRequestId;
    set({ isLoading: true, error: null });
    try {
      const stats = await studyTrackerService.getStudyStats(workspaceId, get().timeRange);
      if (requestId === latestRequestId) {
        set({ stats, isLoading: false, error: null });
      }
    } catch (err: any) {
      if (requestId === latestRequestId) {
        set({
          isLoading: false,
          error: err?.message || 'Failed to fetch study statistics',
        });
      }
    }
  },
}));
