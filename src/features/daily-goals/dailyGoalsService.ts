import { DailyGoalRepository, dailyGoalRepository } from '../../services/database/repositories/dailyGoalRepository';
import { FocusSessionRepository } from '../../services/database/repositories/focusSessionRepository';
import { TodoRepository } from '../../services/database/repositories/todoRepository';
import { db } from '../../services/database/db';
import { DailyGoalEntity } from '../../types/database';
import {
  DailyGoalProgressItem,
  DailyGoalsSummary,
  DailyGoalType,
  DailyGoalTargetSchema,
} from '../../types/dailyGoals';

export const DEFAULT_GOAL_CONFIGS: Record<DailyGoalType, { title: string; defaultTarget: number; unit: string }> = {
  focus_time: {
    title: 'Daily Focus Time',
    defaultTarget: 120, // 2 hours default
    unit: 'mins',
  },
  focus_sessions: {
    title: 'Focus Sessions',
    defaultTarget: 4, // 4 pomodoro/study sessions default
    unit: 'sessions',
  },
  completed_todos: {
    title: 'Completed Tasks',
    defaultTarget: 3, // 3 tasks default
    unit: 'tasks',
  },
  custom: {
    title: 'Custom Target',
    defaultTarget: 1,
    unit: 'units',
  },
};

export class DailyGoalsService {
  constructor(
    private goalRepo: DailyGoalRepository = dailyGoalRepository,
    private focusRepo: FocusSessionRepository = new FocusSessionRepository(db),
    private todoRepo: TodoRepository = new TodoRepository(db)
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
   * Generates deterministic ID for a daily goal to prevent duplicates.
   */
  public generateGoalId(type: DailyGoalType, dateString: string, workspaceId?: string): string {
    const wsPrefix = workspaceId || 'global';
    return `dg_${wsPrefix}_${dateString}_${type}`;
  }

  /**
   * Determines the goal type from an entity's ID or title.
   */
  public inferGoalType(goal: DailyGoalEntity): DailyGoalType {
    if (goal.id.includes('focus_time') || goal.title.toLowerCase().includes('focus time')) {
      return 'focus_time';
    }
    if (goal.id.includes('focus_sessions') || goal.title.toLowerCase().includes('session')) {
      return 'focus_sessions';
    }
    if (goal.id.includes('completed_todos') || goal.title.toLowerCase().includes('task')) {
      return 'completed_todos';
    }
    return 'custom';
  }

  /**
   * Loads or initializes daily goals and calculates progress from source-of-truth tables.
   */
  async getDailyGoalsSummary(
    workspaceId: string | undefined,
    referenceDate: Date = new Date()
  ): Promise<DailyGoalsSummary> {
    const dateString = this.toLocalDateString(referenceDate);

    // 1. Calculate boundaries of the reference day in local time
    const startOfDay = new Date(referenceDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(referenceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Fetch existing goals for this date & workspace
    let existingGoals = await this.goalRepo.getGoalsForDate(dateString, workspaceId);

    // If no goals exist yet for this date, initialize with default goals
    if (existingGoals.length === 0) {
      const now = Date.now();
      const standardTypes: DailyGoalType[] = ['focus_time', 'focus_sessions', 'completed_todos'];

      existingGoals = standardTypes.map((type) => {
        const conf = DEFAULT_GOAL_CONFIGS[type];
        return {
          id: this.generateGoalId(type, dateString, workspaceId),
          workspaceId,
          title: conf.title,
          targetValue: conf.defaultTarget,
          currentValue: 0,
          unit: conf.unit,
          dateString,
          createdAt: now,
          updatedAt: now,
        };
      });

      await this.goalRepo.bulkSaveGoals(existingGoals);
    }

    // 3. Compute actual progress from FocusSessionRepository
    const rawSessions = await this.focusRepo.getByDateRange(
      workspaceId,
      startOfDay.getTime(),
      endOfDay.getTime()
    );

    // Filter valid completed focus sessions (exclude breaks, cancelled, incomplete)
    const validFocusSessions = rawSessions.filter(
      (s) => s.completed === true && (s.type === 'pomodoro' || s.type === 'study')
    );

    const actualFocusMinutes = validFocusSessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );
    const actualCompletedSessions = validFocusSessions.length;

    // 4. Compute actual progress from TodoRepository
    // Strictly adheres to Issue A requirements:
    // - dueDate is deadline, NOT completion date. Never infer completion time from dueDate.
    // - Count toward today's goal ONLY when completedAt is reliably within today's local boundaries.
    // - If completedAt does not exist or task is not completed, do not count it.
    const allTodos = await this.todoRepo.getByWorkspace(workspaceId);
    const completedTodosToday = allTodos.filter((t) => {
      if (!t.completed) return false;
      if (typeof t.completedAt === 'number') {
        return t.completedAt >= startOfDay.getTime() && t.completedAt <= endOfDay.getTime();
      }
      return false;
    });
    const actualCompletedTasks = completedTodosToday.length;

    // 5. Update currentValue for each goal and calculate progress item
    const progressItems: DailyGoalProgressItem[] = [];
    const updatedEntitiesToPersist: DailyGoalEntity[] = [];

    for (const goal of existingGoals) {
      const type = this.inferGoalType(goal);
      let currentValue = 0;

      if (type === 'focus_time') {
        currentValue = actualFocusMinutes;
      } else if (type === 'focus_sessions') {
        currentValue = actualCompletedSessions;
      } else if (type === 'completed_todos') {
        currentValue = actualCompletedTasks;
      } else {
        currentValue = goal.currentValue;
      }

      const targetValue = goal.targetValue;
      const percentage = targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;
      const isCompleted = currentValue >= targetValue;

      const progressItem: DailyGoalProgressItem = {
        ...goal,
        currentValue,
        type,
        percentage,
        isCompleted,
      };

      progressItems.push(progressItem);

      // If currentValue changed in DB, queue update
      if (goal.currentValue !== currentValue) {
        updatedEntitiesToPersist.push({
          ...goal,
          currentValue,
          updatedAt: Date.now(),
        });
      }
    }

    if (updatedEntitiesToPersist.length > 0) {
      await this.goalRepo.bulkSaveGoals(updatedEntitiesToPersist);
    }

    // 6. Calculate overall summary
    const totalGoals = progressItems.length;
    const completedCount = progressItems.filter((g) => g.isCompleted).length;
    const overallPercentage =
      totalGoals > 0
        ? Math.round(progressItems.reduce((acc, g) => acc + g.percentage, 0) / totalGoals)
        : 0;
    const allCompleted = totalGoals > 0 && completedCount === totalGoals;

    return {
      dateString,
      goals: progressItems,
      overallPercentage,
      allCompleted,
      completedCount,
      totalCount: totalGoals,
    };
  }

  /**
   * Updates target value for a specific goal with Zod validation.
   */
  async updateGoalTarget(
    goalId: string,
    newTarget: number,
    workspaceId?: string,
    referenceDate: Date = new Date()
  ): Promise<DailyGoalsSummary> {
    const validatedTarget = DailyGoalTargetSchema.parse(newTarget);
    const existing = await this.goalRepo.getById(goalId);

    if (existing) {
      const updated: DailyGoalEntity = {
        ...existing,
        targetValue: validatedTarget,
        updatedAt: Date.now(),
      };
      await this.goalRepo.saveGoal(updated);
    }

    return this.getDailyGoalsSummary(workspaceId, referenceDate);
  }

  /**
   * Resets goals for the given date back to factory default targets.
   */
  async resetGoalsToDefaults(
    workspaceId?: string,
    referenceDate: Date = new Date()
  ): Promise<DailyGoalsSummary> {
    const dateString = this.toLocalDateString(referenceDate);
    await this.goalRepo.clearGoalsForDate(dateString, workspaceId);
    return this.getDailyGoalsSummary(workspaceId, referenceDate);
  }
}

export const dailyGoalsService = new DailyGoalsService();
