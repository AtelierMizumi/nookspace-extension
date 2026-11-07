export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export type CalendarViewMode = 'month' | 'heatmap';

export interface DayActivity {
  dateString: string; // YYYY-MM-DD
  focusMinutes: number;
  completedSessions: number;
  completedTodos: number;
  completedGoals: number;
  isActive: boolean; // Active study day (at least 1 completed focus session, completed todo, or goal)
  heatmapLevel: HeatmapLevel; // Derived strictly from focusMinutes
}

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  isPendingToday: boolean; // True if today has no activity yet but yesterday was active
  activeDateCount: number;
}

export interface HeatmapCell {
  dateString: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  focusMinutes: number;
  heatmapLevel: HeatmapLevel;
  isActive: boolean;
  isToday: boolean;
}

export interface CalendarMonthDay {
  dateString: string | null;
  dayNumber: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  activity?: DayActivity;
}

export interface CalendarTrackerData {
  referenceDateString: string; // Today's date YYYY-MM-DD
  targetMonthDate: Date;
  monthDays: CalendarMonthDay[];
  heatmapCells: HeatmapCell[];
  streaks: StreakInfo;
  dayMap: Record<string, DayActivity>;
}

export interface StreakPolicy {
  isConsecutive(prevOrdinal: number, currentOrdinal: number): boolean;
}
