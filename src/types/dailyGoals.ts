import { z } from 'zod';
import { DailyGoalEntity } from './database';

export type { DailyGoalEntity };

export const DailyGoalTypeSchema = z.enum([
  'focus_time',
  'focus_sessions',
  'completed_todos',
  'custom',
]);

export type DailyGoalType = z.infer<typeof DailyGoalTypeSchema>;

export const DailyGoalTargetSchema = z
  .number({ invalid_type_error: 'Target must be a number' })
  .int('Target must be an integer')
  .positive('Target must be greater than 0')
  .max(10000, 'Target value cannot exceed 10,000');

export const DailyGoalEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  title: z.string().trim().min(1, 'Title cannot be empty').max(100, 'Title cannot exceed 100 characters'),
  targetValue: DailyGoalTargetSchema,
  currentValue: z.number().nonnegative('Current value cannot be negative'),
  unit: z.string().trim().max(20).optional(),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date string must be YYYY-MM-DD'),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export interface DailyGoalProgressItem extends DailyGoalEntity {
  type: DailyGoalType;
  percentage: number;
  isCompleted: boolean;
}

export interface DailyGoalsSummary {
  dateString: string;
  goals: DailyGoalProgressItem[];
  overallPercentage: number;
  allCompleted: boolean;
  completedCount: number;
  totalCount: number;
}
