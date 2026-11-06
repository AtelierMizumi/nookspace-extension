import { z } from 'zod';
import { db, NookSpaceDB } from '../db';
import { FocusSessionEntity } from '../../../types/database';

export const FocusSessionTypeSchema = z.enum(['pomodoro', 'short_break', 'long_break', 'study']);
export type FocusSessionType = z.infer<typeof FocusSessionTypeSchema>;

export const FocusSessionEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  type: FocusSessionTypeSchema,
  category: z.string().trim().max(50).optional(),
  durationMinutes: z.number().positive('Duration must be greater than 0'),
  startedAt: z.number().int().positive('Started timestamp must be positive'),
  completedAt: z.number().int().positive('Completed timestamp must be positive'),
  completed: z.boolean(),
}).refine((data) => data.completedAt >= data.startedAt, {
  message: 'completedAt must be greater than or equal to startedAt',
  path: ['completedAt'],
});

export const FocusSessionCreateSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  type: FocusSessionTypeSchema.default('pomodoro'),
  category: z.string().trim().max(50).optional(),
  durationMinutes: z.number().positive('Duration must be greater than 0'),
  startedAt: z.number().int().positive('Started timestamp must be positive'),
  completedAt: z.number().int().positive('Completed timestamp must be positive'),
  completed: z.boolean().default(true),
}).refine((data) => data.completedAt >= data.startedAt, {
  message: 'completedAt must be greater than or equal to startedAt',
  path: ['completedAt'],
});

export type FocusSessionCreateInput = z.input<typeof FocusSessionCreateSchema>;

export const FocusSessionUpdateSchema = z.object({
  category: z.string().trim().max(50).optional(),
  durationMinutes: z.number().positive().optional(),
  completedAt: z.number().int().positive().optional(),
  completed: z.boolean().optional(),
});

export type FocusSessionUpdateInput = z.input<typeof FocusSessionUpdateSchema>;

export interface FocusStats {
  totalMinutes: number;
  totalSessions: number;
  pomodorosCompleted: number;
  studyMinutes: number;
  breakMinutes: number;
  categoryBreakdown: Record<string, number>;
}

export class FocusSessionRepository {
  constructor(private database: NookSpaceDB = db) {}

  async getById(id: string): Promise<FocusSessionEntity | undefined> {
    return this.database.focusSessions.get(id);
  }

  async getByWorkspace(workspaceId?: string, limit?: number): Promise<FocusSessionEntity[]> {
    let collection = workspaceId
      ? this.database.focusSessions.where('workspaceId').equals(workspaceId)
      : this.database.focusSessions.toCollection();

    let items = await collection.reverse().sortBy('startedAt');
    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }
    return items;
  }

  async getByDateRange(
    workspaceId: string | undefined,
    startTimestamp: number,
    endTimestamp: number
  ): Promise<FocusSessionEntity[]> {
    if (startTimestamp > endTimestamp) {
      throw new Error('Invalid range: startTimestamp cannot be greater than endTimestamp');
    }

    const all = await this.getByWorkspace(workspaceId);
    return all.filter((s) => s.startedAt >= startTimestamp && s.startedAt <= endTimestamp);
  }

  async getCompletedSessions(
    workspaceId: string | undefined,
    startTimestamp: number,
    endTimestamp: number
  ): Promise<FocusSessionEntity[]> {
    const sessions = await this.getByDateRange(workspaceId, startTimestamp, endTimestamp);
    return sessions.filter((s) => s.completed);
  }

  async getTodayStats(workspaceId?: string): Promise<FocusStats> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaySessions = await this.getByDateRange(
      workspaceId,
      startOfToday.getTime(),
      endOfToday.getTime()
    );

    let totalMinutes = 0;
    let pomodorosCompleted = 0;
    let studyMinutes = 0;
    let breakMinutes = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const session of todaySessions) {
      if (!session.completed) continue;

      totalMinutes += session.durationMinutes;

      if (session.type === 'pomodoro') {
        pomodorosCompleted += 1;
      } else if (session.type === 'study') {
        studyMinutes += session.durationMinutes;
      } else if (session.type === 'short_break' || session.type === 'long_break') {
        breakMinutes += session.durationMinutes;
      }

      const cat = session.category || 'General';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + session.durationMinutes;
    }

    return {
      totalMinutes,
      totalSessions: todaySessions.filter((s) => s.completed).length,
      pomodorosCompleted,
      studyMinutes,
      breakMinutes,
      categoryBreakdown,
    };
  }

  async create(input: FocusSessionCreateInput): Promise<FocusSessionEntity> {
    const validated = FocusSessionCreateSchema.parse(input);
    const now = Date.now();
    const id = `fs-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const entity: FocusSessionEntity = {
      id,
      workspaceId: validated.workspaceId,
      type: validated.type,
      category: validated.category,
      durationMinutes: validated.durationMinutes,
      startedAt: validated.startedAt,
      completedAt: validated.completedAt,
      completed: validated.completed,
    };

    FocusSessionEntitySchema.parse(entity);

    await this.database.focusSessions.add(entity);
    return entity;
  }

  async update(
    id: string,
    updates: FocusSessionUpdateInput,
    expectedWorkspaceId?: string
  ): Promise<FocusSessionEntity> {
    const validated = FocusSessionUpdateSchema.parse(updates);
    const existing = await this.database.focusSessions.get(id);
    if (!existing) throw new Error(`Focus session with id "${id}" not found`);

    if (expectedWorkspaceId && existing.workspaceId && existing.workspaceId !== expectedWorkspaceId) {
      throw new Error(`Workspace Isolation Violation: Cannot update session belonging to workspace "${existing.workspaceId}" from "${expectedWorkspaceId}"`);
    }

    const updatedEntity: FocusSessionEntity = {
      ...existing,
      category: validated.category ?? existing.category,
      durationMinutes: validated.durationMinutes ?? existing.durationMinutes,
      completedAt: validated.completedAt ?? existing.completedAt,
      completed: validated.completed ?? existing.completed,
    };

    FocusSessionEntitySchema.parse(updatedEntity);

    await this.database.focusSessions.put(updatedEntity);
    return updatedEntity;
  }

  async completeSession(
    id: string,
    completedAt?: number,
    expectedWorkspaceId?: string
  ): Promise<FocusSessionEntity> {
    const existing = await this.database.focusSessions.get(id);
    if (!existing) throw new Error(`Focus session with id "${id}" not found`);

    if (expectedWorkspaceId && existing.workspaceId && existing.workspaceId !== expectedWorkspaceId) {
      throw new Error(`Workspace Isolation Violation: Cannot complete session belonging to workspace "${existing.workspaceId}" from "${expectedWorkspaceId}"`);
    }

    if (existing.completed) {
      // Prevent duplicate completion
      return existing;
    }

    const finalCompletedAt = completedAt || Date.now();
    return this.update(
      id,
      {
        completed: true,
        completedAt: finalCompletedAt,
      },
      expectedWorkspaceId
    );
  }

  async delete(id: string, expectedWorkspaceId?: string): Promise<void> {
    const existing = await this.database.focusSessions.get(id);
    if (!existing) return;

    if (expectedWorkspaceId && existing.workspaceId && existing.workspaceId !== expectedWorkspaceId) {
      throw new Error(`Workspace Isolation Violation: Cannot delete session belonging to workspace "${existing.workspaceId}" from "${expectedWorkspaceId}"`);
    }

    await this.database.focusSessions.delete(id);
  }

  async clearHistory(workspaceId?: string): Promise<number> {
    if (workspaceId) {
      const items = await this.database.focusSessions.where('workspaceId').equals(workspaceId).toArray();
      const ids = items.map((i) => i.id);
      await this.database.focusSessions.bulkDelete(ids);
      return ids.length;
    } else {
      const count = await this.database.focusSessions.count();
      await this.database.focusSessions.clear();
      return count;
    }
  }
}

export const focusSessionRepo = new FocusSessionRepository();
