import { FocusSessionRepository } from '../../services/database/repositories/focusSessionRepository';
import { db } from '../../services/database/db';
import { StudyTrackerStats, StudyTimeRange, DailyActivityPoint } from '../../types/studyTracker';
import { FocusSessionEntity } from '../../types/database';

export class StudyTrackerService {
  constructor(private repo: FocusSessionRepository = new FocusSessionRepository(db)) {}

  /**
   * Helper to format a Date into YYYY-MM-DD in local timezone
   */
  public toLocalDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculates study stats for a given time range (daily, weekly, monthly).
   * Strictly filters: completed === true AND (type === 'pomodoro' OR type === 'study').
   * Breaks are EXCLUDED from focus duration.
   */
  async getStudyStats(
    workspaceId: string | undefined,
    range: StudyTimeRange,
    referenceDate: Date = new Date()
  ): Promise<StudyTrackerStats> {
    const numDays = range === '7D' ? 7 : range === '14D' ? 14 : 30;

    // Start of today in local timezone
    const endOfRange = new Date(referenceDate);
    endOfRange.setHours(23, 59, 59, 999);

    const startOfRange = new Date(referenceDate);
    startOfRange.setDate(startOfRange.getDate() - (numDays - 1));
    startOfRange.setHours(0, 0, 0, 0);

    const sessions = await this.repo.getByDateRange(
      workspaceId,
      startOfRange.getTime(),
      endOfRange.getTime()
    );

    // Filter only completed focus sessions (pomodoro or study)
    const validSessions = sessions.filter(
      (s) => s.completed && (s.type === 'pomodoro' || s.type === 'study')
    );

    // Group by local date string
    const dateMap = new Map<string, { minutes: number; count: number }>();

    // Prepopulate all days in range with 0 to ensure no empty gaps
    for (let i = 0; i < numDays; i++) {
      const dayDate = new Date(startOfRange);
      dayDate.setDate(dayDate.getDate() + i);
      const ds = this.toLocalDateString(dayDate);
      dateMap.set(ds, { minutes: 0, count: 0 });
    }

    let totalFocusMinutes = 0;
    let completedSessions = 0;

    const todayStr = this.toLocalDateString(referenceDate);
    let todayFocusMinutes = 0;
    let todayCompletedSessions = 0;

    for (const session of validSessions) {
      const sessionDate = new Date(session.startedAt);
      const ds = this.toLocalDateString(sessionDate);

      totalFocusMinutes += session.durationMinutes;
      completedSessions += 1;

      if (ds === todayStr) {
        todayFocusMinutes += session.durationMinutes;
        todayCompletedSessions += 1;
      }

      if (dateMap.has(ds)) {
        const current = dateMap.get(ds)!;
        dateMap.set(ds, {
          minutes: current.minutes + session.durationMinutes,
          count: current.count + 1,
        });
      }
    }

    const averageSessionMinutes =
      completedSessions > 0 ? Math.round(totalFocusMinutes / completedSessions) : 0;

    // Build ordered activity history points
    const activityHistory: DailyActivityPoint[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (const [dateString, data] of dateMap.entries()) {
      const parts = dateString.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      activityHistory.push({
        dateString,
        dayLabel: dayNames[d.getDay()],
        focusMinutes: data.minutes,
        completedSessions: data.count,
      });
    }

    return {
      totalFocusMinutes,
      completedSessions,
      averageSessionMinutes,
      activityHistory,
      todayFocusMinutes,
      todayCompletedSessions,
    };
  }
}

export const studyTrackerService = new StudyTrackerService();
