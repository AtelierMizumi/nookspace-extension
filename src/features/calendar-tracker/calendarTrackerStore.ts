import { create } from 'zustand';
import { CalendarViewMode, CalendarTrackerData } from '../../types/calendarTracker';
import { calendarTrackerService, CalendarTrackerService } from './calendarTrackerService';

interface CalendarTrackerState {
  viewMode: CalendarViewMode;
  currentMonth: Date;
  selectedDateString: string | null;
  data: CalendarTrackerData | null;
  isLoading: boolean;
  error: string | null;
  activeWorkspaceId: string | undefined;

  // Actions
  setViewMode: (viewMode: CalendarViewMode) => void;
  setSelectedDate: (dateString: string | null) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  goToToday: () => void;
  fetchData: (workspaceId?: string) => Promise<void>;
}

let latestRequestId = 0;

export const createCalendarTrackerStore = (
  service: CalendarTrackerService = calendarTrackerService
) =>
  create<CalendarTrackerState>((set, get) => ({
    viewMode: 'month',
    currentMonth: new Date(),
    selectedDateString: null,
    data: null,
    isLoading: false,
    error: null,
    activeWorkspaceId: undefined,

    setViewMode: (viewMode) => set({ viewMode }),

    setSelectedDate: (dateString) => set({ selectedDateString: dateString }),

    nextMonth: () => {
      const cur = get().currentMonth;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      set({ currentMonth: next });
      get().fetchData(get().activeWorkspaceId);
    },

    prevMonth: () => {
      const cur = get().currentMonth;
      const prev = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
      set({ currentMonth: prev });
      get().fetchData(get().activeWorkspaceId);
    },

    goToToday: () => {
      const today = new Date();
      set({ currentMonth: today, selectedDateString: service.toLocalDateString(today) });
      get().fetchData(get().activeWorkspaceId);
    },

    fetchData: async (workspaceId) => {
      const requestId = ++latestRequestId;
      set({ isLoading: true, error: null, activeWorkspaceId: workspaceId });

      try {
        const { currentMonth } = get();
        const data = await service.getCalendarTrackerData(workspaceId, currentMonth);

        // Discard stale responses if a newer fetch was initiated or workspace changed
        if (requestId === latestRequestId) {
          // If no date is currently selected, default to today
          const selectedDateString = get().selectedDateString || data.referenceDateString;
          set({
            data,
            selectedDateString,
            isLoading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (requestId === latestRequestId) {
          set({
            isLoading: false,
            error: err?.message || 'Failed to load study calendar',
          });
        }
      }
    },
  }));

export const useCalendarTrackerStore = createCalendarTrackerStore();
