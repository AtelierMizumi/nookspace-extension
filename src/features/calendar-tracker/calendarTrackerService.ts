import { FocusSessionRepository } from '../../services/database/repositories/focusSessionRepository';
import { TodoRepository } from '../../services/database/repositories/todoRepository';
import { DailyGoalRepository, dailyGoalRepository } from '../../services/database/repositories/dailyGoalRepository';
import { db } from '../../services/database/db';
import {
  CalendarTrackerData,
  CalendarMonthDay,
  HeatmapCell,
  DayActivity,
} from '../../types/calendarTracker';
import {
  toDayOrdinal,
  fromDayOrdinal,
  getHeatmapLevel,
  calculateStreaks,
  isValidDateString,
} from './streakCalculator';

export class CalendarTrackerService {
  constructor(
    private focusRepo: FocusSessionRepository = new FocusSessionRepository(db),
    private todoRepo: TodoRepository = new TodoRepository(db),
    private goalRepo: DailyGoalRepository = dailyGoalRepository
  ) {}

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
   * Aggregates activity history and computes Calendar & Streak metrics.
   * Full historical data is used for Best Streak, with localized month and heatmap projections.
   */
  async getCalendarTrackerData(
    workspaceId: string | undefined,
    targetMonthDate: Date = new Date(),
    referenceDate: Date = new Date()
  ): Promise<CalendarTrackerData> {
    const referenceDateString = this.toLocalDateString(referenceDate);

    // 1. Fetch all completed sessions for this workspace
    const rawSessions = await this.focusRepo.getByWorkspace(workspaceId);
    const validSessions = rawSessions.filter(
      (s) => s.completed === true && (s.type === 'pomodoro' || s.type === 'study')
    );

    // 2. Fetch all completed todos for this workspace with completedAt
    const rawTodos = await this.todoRepo.getByWorkspace(workspaceId, { completed: true });
    const validTodos = rawTodos.filter((t) => t.completed && typeof t.completedAt === 'number');

    // 3. Fetch goals for this workspace
    // Uses dailyGoals table filtered by workspace
    const rawGoals = workspaceId
      ? await this.goalRepo['database'].dailyGoals.where('workspaceId').equals(workspaceId).toArray()
      : await this.goalRepo['database'].dailyGoals.toCollection().filter((g) => !g.workspaceId).toArray();
    const validCompletedGoals = rawGoals.filter(
      (g) => g.currentValue >= g.targetValue && g.targetValue > 0 && isValidDateString(g.dateString)
    );

    // 4. Build comprehensive day activity map
    const dayMap = new Map<string, DayActivity>();

    const getOrCreateDayActivity = (dateStr: string): DayActivity => {
      let existing = dayMap.get(dateStr);
      if (!existing) {
        existing = {
          dateString: dateStr,
          focusMinutes: 0,
          completedSessions: 0,
          completedTodos: 0,
          completedGoals: 0,
          isActive: false,
          heatmapLevel: 0,
        };
        dayMap.set(dateStr, existing);
      }
      return existing;
    };

    // Populate focus sessions
    for (const session of validSessions) {
      // Use completedAt or startedAt according to local timezone
      const sessionDate = new Date(session.completedAt || session.startedAt);
      const ds = this.toLocalDateString(sessionDate);
      const act = getOrCreateDayActivity(ds);
      act.focusMinutes += session.durationMinutes || 0;
      act.completedSessions += 1;
      act.isActive = true;
    }

    // Populate completed todos
    for (const todo of validTodos) {
      if (todo.completedAt) {
        const todoDate = new Date(todo.completedAt);
        const ds = this.toLocalDateString(todoDate);
        const act = getOrCreateDayActivity(ds);
        act.completedTodos += 1;
        act.isActive = true;
      }
    }

    // Populate completed daily goals
    for (const goal of validCompletedGoals) {
      const act = getOrCreateDayActivity(goal.dateString);
      act.completedGoals += 1;
      act.isActive = true;
    }

    // Calculate Heatmap levels for all recorded days
    for (const act of dayMap.values()) {
      act.heatmapLevel = getHeatmapLevel(act.focusMinutes);
    }

    // 5. Compute Active Dates Set & Streaks
    const activeDates = new Set<string>();
    for (const [ds, act] of dayMap.entries()) {
      if (act.isActive && isValidDateString(ds)) {
        activeDates.add(ds);
      }
    }

    const streaks = calculateStreaks(activeDates, referenceDateString);

    // 6. Generate Calendar Month Grid for targetMonthDate (Sunday-first)
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const monthDays: CalendarMonthDay[] = [];

    // Prepend blank padding days for Sunday-first alignment
    for (let i = 0; i < firstDayIndex; i++) {
      monthDays.push({
        dateString: null,
        dayNumber: null,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Add days of the month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const ds = this.toLocalDateString(dayDate);
      const isToday = ds === referenceDateString;
      const activity = dayMap.get(ds) || {
        dateString: ds,
        focusMinutes: 0,
        completedSessions: 0,
        completedTodos: 0,
        completedGoals: 0,
        isActive: false,
        heatmapLevel: 0,
      };

      monthDays.push({
        dateString: ds,
        dayNumber: d,
        isCurrentMonth: true,
        isToday,
        activity,
      });
    }

    // 7. Generate 7-Week Activity Heatmap (49 cells, aligned to Sunday-Saturday)
    const refDayOfWeek = referenceDate.getDay();
    const endOfWeek = new Date(referenceDate);
    endOfWeek.setDate(referenceDate.getDate() + (6 - refDayOfWeek)); // End of current week (Saturday)

    const startOfHeatmap = new Date(endOfWeek);
    startOfHeatmap.setDate(endOfWeek.getDate() - 48); // 49 days total

    const heatmapCells: HeatmapCell[] = [];
    for (let i = 0; i < 49; i++) {
      const cellDate = new Date(startOfHeatmap);
      cellDate.setDate(startOfHeatmap.getDate() + i);
      const ds = this.toLocalDateString(cellDate);
      const act = dayMap.get(ds);
      const focusMinutes = act?.focusMinutes || 0;

      heatmapCells.push({
        dateString: ds,
        dayOfWeek: cellDate.getDay(),
        focusMinutes,
        heatmapLevel: getHeatmapLevel(focusMinutes),
        isActive: Boolean(act?.isActive),
        isToday: ds === referenceDateString,
      });
    }

    // Convert map to plain record for serialization
    const dayMapRecord: Record<string, DayActivity> = {};
    for (const [k, v] of dayMap.entries()) {
      dayMapRecord[k] = v;
    }

    return {
      referenceDateString,
      targetMonthDate,
      monthDays,
      heatmapCells,
      streaks,
      dayMap: dayMapRecord,
    };
  }
}

export const calendarTrackerService = new CalendarTrackerService();
