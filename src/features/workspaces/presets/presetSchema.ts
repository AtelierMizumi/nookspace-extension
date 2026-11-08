import { z } from 'zod';
import { Breakpoint, BREAKPOINT_COLUMNS } from '../../../types/database';
import { WorkspaceColorSchema } from '../../../types/workspaces';
import { WORKSPACE_ICONS } from '../components/WorkspaceIconPicker';
import { PresetCategory } from './types';

export const PRESET_BREAKPOINTS: readonly Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'] as const;

export const PRESET_CATEGORIES: readonly [PresetCategory, ...PresetCategory[]] = [
  'personal',
  'study',
  'development',
  'productivity',
];

export const PresetBreakpointLayoutSchema = z
  .object({
    x: z
      .number({ invalid_type_error: 'x must be a number' })
      .int('x must be an integer')
      .min(0, 'x must be a non-negative integer'),
    y: z
      .number({ invalid_type_error: 'y must be a number' })
      .int('y must be an integer')
      .min(0, 'y must be a non-negative integer'),
    w: z
      .number({ invalid_type_error: 'w must be a number' })
      .int('w must be an integer')
      .min(1, 'w must be at least 1'),
    h: z
      .number({ invalid_type_error: 'h must be a number' })
      .int('h must be an integer')
      .min(1, 'h must be at least 1'),
    minW: z
      .number({ invalid_type_error: 'minW must be a number' })
      .int('minW must be an integer')
      .min(1, 'minW must be at least 1')
      .optional(),
    minH: z
      .number({ invalid_type_error: 'minH must be a number' })
      .int('minH must be an integer')
      .min(1, 'minH must be at least 1')
      .optional(),
    maxW: z
      .number({ invalid_type_error: 'maxW must be a number' })
      .int('maxW must be an integer')
      .min(1, 'maxW must be at least 1')
      .optional(),
    maxH: z
      .number({ invalid_type_error: 'maxH must be a number' })
      .int('maxH must be an integer')
      .min(1, 'maxH must be at least 1')
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.minW !== undefined && data.maxW !== undefined && data.maxW < data.minW) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `maxW (${data.maxW}) cannot be less than minW (${data.minW})`,
        path: ['maxW'],
      });
    }
    if (data.minH !== undefined && data.maxH !== undefined && data.maxH < data.minH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `maxH (${data.maxH}) cannot be less than minH (${data.minH})`,
        path: ['maxH'],
      });
    }
  });

export const PresetWidgetDefinitionSchema = z
  .object({
    widgetType: z.string().trim().min(1, 'Widget type cannot be empty'),
    config: z.record(z.string(), z.unknown()).default({}),
    layout: z.object({
      lg: PresetBreakpointLayoutSchema,
      md: PresetBreakpointLayoutSchema,
      sm: PresetBreakpointLayoutSchema,
      xs: PresetBreakpointLayoutSchema,
      xxs: PresetBreakpointLayoutSchema,
    }),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (const bp of PRESET_BREAKPOINTS) {
      const bpLayout = data.layout[bp];
      if (bpLayout) {
        const maxCols = BREAKPOINT_COLUMNS[bp] || 12;
        if (bpLayout.x + bpLayout.w > maxCols) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Widget layout for breakpoint '${bp}' exceeds bounds (x: ${bpLayout.x} + w: ${bpLayout.w} = ${
              bpLayout.x + bpLayout.w
            } > maxCols: ${maxCols})`,
            path: ['layout', bp, 'w'],
          });
        }
      }
    }
  });

export const WorkspacePresetSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1, 'Preset ID cannot be empty')
      .regex(/^[a-z0-9-]+$/, 'Preset ID must be lowercase alphanumeric with hyphens'),
    version: z
      .number({ invalid_type_error: 'version must be a number' })
      .int('version must be an integer')
      .min(1, 'Preset version must be an integer >= 1'),
    name: z
      .string()
      .trim()
      .min(1, 'Preset name is required')
      .max(50, 'Preset name must be 50 characters or less'),
    description: z
      .string()
      .trim()
      .min(1, 'Preset description is required')
      .max(250, 'Preset description must be 250 characters or less'),
    category: z.enum(PRESET_CATEGORIES),
    icon: z.string().trim().min(1, 'Icon cannot be empty'),
    color: WorkspaceColorSchema.nullable().default(null),
    preview: z
      .object({
        highlights: z
          .array(z.string().trim().min(1, 'Highlight item cannot be empty'))
          .min(1, 'At least one preview highlight is required'),
      })
      .strict(),
    widgets: z
      .array(PresetWidgetDefinitionSchema)
      .min(1, 'At least one widget must be defined in preset'),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Check icon existence
    if (!WORKSPACE_ICONS[data.icon]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown icon '${data.icon}'. Must be a registered workspace icon.`,
        path: ['icon'],
      });
    }

    // 2. Check layout overlaps across all widgets on each breakpoint
    for (const bp of PRESET_BREAKPOINTS) {
      const widgets = data.widgets;
      for (let i = 0; i < widgets.length; i++) {
        const itemA = widgets[i].layout[bp];
        if (!itemA) continue;

        for (let j = i + 1; j < widgets.length; j++) {
          const itemB = widgets[j].layout[bp];
          if (!itemB) continue;

          // Two rectangles [x, x + w) x [y, y + h) overlap iff:
          // itemA.x < itemB.x + itemB.w && itemA.x + itemA.w > itemB.x &&
          // itemA.y < itemB.y + itemB.h && itemA.y + itemA.h > itemB.y
          const overlap =
            itemA.x < itemB.x + itemB.w &&
            itemA.x + itemA.w > itemB.x &&
            itemA.y < itemB.y + itemB.h &&
            itemA.y + itemA.h > itemB.y;

          if (overlap) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Widgets '${widgets[i].widgetType}' (index ${i}) and '${widgets[j].widgetType}' (index ${j}) overlap on breakpoint '${bp}' (item A: [x=${itemA.x}, y=${itemA.y}, w=${itemA.w}, h=${itemA.h}], item B: [x=${itemB.x}, y=${itemB.y}, w=${itemB.w}, h=${itemB.h}])`,
              path: ['widgets', j, 'layout', bp],
            });
          }
        }
      }
    }
  });

export type WorkspacePresetValidationResult =
  | { success: true; data: z.infer<typeof WorkspacePresetSchema> }
  | { success: false; error: string; issues: z.ZodIssue[] };

export function validateWorkspacePreset(preset: unknown): WorkspacePresetValidationResult {
  const result = WorkspacePresetSchema.safeParse(preset);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
    issues: result.error.errors,
  };
}
