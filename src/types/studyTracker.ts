import { z } from 'zod';
import { FocusSessionEntity } from './database';

export type StudyTimeRange = '7D' | '14D' | '30D';

export interface DailyActivityPoint {
  dateString: string; // YYYY-MM-DD (local)
  dayLabel: string; // 'Mon', 'Tue', etc.
  focusMinutes: number;
  completedSessions: number;
}

export interface StudyTrackerStats {
  totalFocusMinutes: number;
  completedSessions: number;
  averageSessionMinutes: number;
  activityHistory: DailyActivityPoint[];
  todayFocusMinutes: number;
  todayCompletedSessions: number;
}

export const StudyTrackerStatsSchema = z.object({
  totalFocusMinutes: z.number().nonnegative(),
  completedSessions: z.number().nonnegative(),
  averageSessionMinutes: z.number().nonnegative(),
  activityHistory: z.array(
    z.object({
      dateString: z.string(),
      dayLabel: z.string(),
      focusMinutes: z.number().nonnegative(),
      completedSessions: z.number().nonnegative(),
    })
  ),
  todayFocusMinutes: z.number().nonnegative(),
  todayCompletedSessions: z.number().nonnegative(),
});
