import { db, NookSpaceDB } from '../db';
import { DailyGoalEntity } from '../../../types/database';
import { DailyGoalEntitySchema } from '../../../types/dailyGoals';

export class DailyGoalRepository {
  constructor(private database: NookSpaceDB = db) {}

  async getById(id: string): Promise<DailyGoalEntity | undefined> {
    return this.database.dailyGoals.get(id);
  }

  /**
   * Retrieves all daily goals for a given date string (YYYY-MM-DD),
   * strictly filtered by workspaceId.
   */
  async getGoalsForDate(dateString: string, workspaceId?: string): Promise<DailyGoalEntity[]> {
    const records = await this.database.dailyGoals
      .where('dateString')
      .equals(dateString)
      .toArray();

    if (workspaceId) {
      return records.filter((r) => r.workspaceId === workspaceId);
    }
    return records.filter((r) => !r.workspaceId);
  }

  /**
   * Saves or updates a daily goal with Zod schema validation.
   */
  async saveGoal(goal: DailyGoalEntity): Promise<DailyGoalEntity> {
    const validated = DailyGoalEntitySchema.parse(goal);
    await this.database.dailyGoals.put(validated);
    return validated;
  }

  /**
   * Bulk saves or updates an array of daily goals in a single transaction.
   */
  async bulkSaveGoals(goals: DailyGoalEntity[]): Promise<void> {
    const validatedGoals = goals.map((g) => DailyGoalEntitySchema.parse(g));
    await this.database.dailyGoals.bulkPut(validatedGoals);
  }

  /**
   * Deletes a daily goal by ID.
   */
  async deleteGoal(id: string): Promise<void> {
    await this.database.dailyGoals.delete(id);
  }

  /**
   * Clears goals for a given date string and workspace.
   */
  async clearGoalsForDate(dateString: string, workspaceId?: string): Promise<void> {
    const matching = await this.getGoalsForDate(dateString, workspaceId);
    const ids = matching.map((g) => g.id);
    if (ids.length > 0) {
      await this.database.dailyGoals.bulkDelete(ids);
    }
  }
}

export const dailyGoalRepository = new DailyGoalRepository();
