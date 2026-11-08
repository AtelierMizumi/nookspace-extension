import { z } from 'zod';

export const STORAGE_KEY_ACTIVE_WORKSPACE_ID = 'nookspace_active_workspace_id';

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const WorkspaceColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g. #6366f1)');

export const WorkspaceSchema = z
  .object({
    id: z.string().min(1, 'Workspace ID cannot be empty'),
    name: z
      .string()
      .trim()
      .min(1, 'Workspace name is required')
      .max(50, 'Workspace name must be 50 characters or less'),
    icon: z.string().trim().min(1, 'Icon cannot be empty').default('LayoutGrid'),
    color: WorkspaceColorSchema.optional(),
    isDefault: z.boolean({ invalid_type_error: 'isDefault must be a boolean' }),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative'),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type WorkspaceEntity = z.infer<typeof WorkspaceSchema>;

export const CreateWorkspaceInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Workspace name is required')
      .max(50, 'Workspace name must be 50 characters or less'),
    icon: z.string().trim().min(1, 'Icon cannot be empty').optional().default('LayoutGrid'),
    color: WorkspaceColorSchema.optional(),
  })
  .strict();

export type CreateWorkspaceInput = z.input<typeof CreateWorkspaceInputSchema>;
export type WorkspaceInput = CreateWorkspaceInput;
export const WorkspaceInputSchema = CreateWorkspaceInputSchema;

export const UpdateWorkspaceInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Workspace name cannot be empty')
      .max(50, 'Workspace name must be 50 characters or less')
      .optional(),
    icon: z.string().trim().min(1, 'Icon cannot be empty').optional(),
    color: WorkspaceColorSchema.nullable().optional(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type UpdateWorkspaceInput = z.input<typeof UpdateWorkspaceInputSchema>;
