import { z } from 'zod';
import { db, NookSpaceDB } from '../db';
import {
  Breakpoint,
  BREAKPOINT_COLUMNS,
  WidgetLayoutEntity,
} from '../../../types/database';
import { synchronizeLayout } from '../../../features/layout-editor/layoutUtils';

export const BreakpointSchema = z.enum(['lg', 'md', 'sm', 'xs', 'xxs']);

export const WidgetLayoutInputSchema = z
  .object({
    id: z.string().optional(),
    workspaceId: z.string().trim().min(1, 'workspaceId is required'),
    widgetInstanceId: z.string().trim().min(1, 'widgetInstanceId is required'),
    breakpoint: BreakpointSchema,
    x: z.number().int().min(0, 'x must be a non-negative integer'),
    y: z.number().int().min(0, 'y must be a non-negative integer'),
    w: z.number().int().min(1, 'w must be at least 1'),
    h: z.number().int().min(1, 'h must be at least 1'),
    minW: z.number().int().min(1).optional(),
    minH: z.number().int().min(1).optional(),
    maxW: z.number().int().min(1).optional(),
    maxH: z.number().int().min(1).optional(),
    isDefault: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const maxCols = BREAKPOINT_COLUMNS[data.breakpoint] || 12;
    if (data.w > maxCols) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `w (${data.w}) cannot exceed maximum columns (${maxCols}) for breakpoint ${data.breakpoint}`,
        path: ['w'],
      });
    }
    if (data.minW && data.maxW && data.maxW < data.minW) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `maxW (${data.maxW}) cannot be less than minW (${data.minW})`,
        path: ['maxW'],
      });
    }
    if (data.minH && data.maxH && data.maxH < data.minH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `maxH (${data.maxH}) cannot be less than minH (${data.minH})`,
        path: ['maxH'],
      });
    }
  });

export type WidgetLayoutInput = z.input<typeof WidgetLayoutInputSchema>;

export class LayoutRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves all layout items for a given workspace and breakpoint.
   */
  async getLayoutsByWorkspace(
    workspaceId: string,
    breakpoint: Breakpoint = 'lg'
  ): Promise<WidgetLayoutEntity[]> {
    if (!workspaceId) return [];
    BreakpointSchema.parse(breakpoint);

    return this.database.widgetLayouts
      .where('[workspaceId+breakpoint]')
      .equals([workspaceId, breakpoint])
      .toArray();
  }

  /**
   * Retrieves all layout items for a workspace grouped across all 5 breakpoints.
   */
  async getAllLayoutsGrouped(
    workspaceId: string
  ): Promise<Record<Breakpoint, WidgetLayoutEntity[]>> {
    const grouped: Record<Breakpoint, WidgetLayoutEntity[]> = {
      lg: [],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    };
    if (!workspaceId) return grouped;

    const all = await this.database.widgetLayouts
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    for (const item of all) {
      if (grouped[item.breakpoint]) {
        grouped[item.breakpoint].push(item);
      }
    }

    return grouped;
  }

  /**
   * Retrieves all layout items for a specific widget instance across all breakpoints.
   */
  async getLayoutsByWidgetInstance(widgetInstanceId: string): Promise<WidgetLayoutEntity[]> {
    if (!widgetInstanceId) return [];
    return this.database.widgetLayouts
      .where('widgetInstanceId')
      .equals(widgetInstanceId)
      .toArray();
  }

  /**
   * Creates a single layout record with full validation.
   */
  async createLayout(input: WidgetLayoutInput): Promise<WidgetLayoutEntity> {
    const validated = WidgetLayoutInputSchema.parse(input);
    const id = input.id || `${validated.workspaceId}_${validated.widgetInstanceId}_${validated.breakpoint}`;
    const now = Date.now();

    const entity: WidgetLayoutEntity = {
      id,
      workspaceId: validated.workspaceId,
      widgetInstanceId: validated.widgetInstanceId,
      breakpoint: validated.breakpoint,
      x: validated.x,
      y: validated.y,
      w: validated.w,
      h: validated.h,
      minW: validated.minW,
      minH: validated.minH,
      maxW: validated.maxW,
      maxH: validated.maxH,
      isDefault: validated.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    await this.database.widgetLayouts.put(entity);
    return entity;
  }

  /**
   * Updates an existing layout record.
   */
  async updateLayout(
    id: string,
    updates: Partial<Omit<WidgetLayoutEntity, 'id' | 'workspaceId' | 'widgetInstanceId' | 'breakpoint' | 'createdAt'>>
  ): Promise<WidgetLayoutEntity> {
    const existing = await this.database.widgetLayouts.get(id);
    if (!existing) {
      throw new Error(`Widget layout with id "${id}" not found`);
    }

    const merged = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    const validated = WidgetLayoutInputSchema.parse(merged);
    await this.database.widgetLayouts.update(id, validated);
    return merged;
  }

  /**
   * Saves an entire array of layout items for a workspace & breakpoint within an atomic transaction.
   */
  async saveLayouts(
    workspaceId: string,
    breakpoint: Breakpoint,
    layouts: WidgetLayoutInput[]
  ): Promise<WidgetLayoutEntity[]> {
    if (!workspaceId) throw new Error('workspaceId is required');
    BreakpointSchema.parse(breakpoint);

    const now = Date.now();
    const validatedEntities: WidgetLayoutEntity[] = [];
    const seenInstanceIds = new Set<string>();

    for (const raw of layouts) {
      if (seenInstanceIds.has(raw.widgetInstanceId)) {
        continue; // Disallow duplicate entries for same instance in the same breakpoint
      }

      const validated = WidgetLayoutInputSchema.parse({
        ...raw,
        workspaceId,
        breakpoint,
      });

      const id = `${workspaceId}_${validated.widgetInstanceId}_${breakpoint}`;
      validatedEntities.push({
        id,
        workspaceId,
        widgetInstanceId: validated.widgetInstanceId,
        breakpoint,
        x: validated.x,
        y: validated.y,
        w: validated.w,
        h: validated.h,
        minW: validated.minW,
        minH: validated.minH,
        maxW: validated.maxW,
        maxH: validated.maxH,
        isDefault: validated.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
      });

      seenInstanceIds.add(validated.widgetInstanceId);
    }

    // Atomic transaction replacing layouts for this workspace and breakpoint
    await this.database.transaction('rw', this.database.widgetLayouts, async () => {
      // Delete existing records for this workspace + breakpoint
      const existing = await this.database.widgetLayouts
        .where('[workspaceId+breakpoint]')
        .equals([workspaceId, breakpoint])
        .primaryKeys();

      if (existing.length > 0) {
        await this.database.widgetLayouts.bulkDelete(existing);
      }

      if (validatedEntities.length > 0) {
        await this.database.widgetLayouts.bulkPut(validatedEntities);
      }
    });

    return validatedEntities;
  }

  /**
   * Deletes layout items for a given widget instance (optionally filtered by breakpoint).
   */
  async deleteLayout(widgetInstanceId: string, breakpoint?: Breakpoint): Promise<void> {
    if (!widgetInstanceId) return;

    if (breakpoint) {
      await this.database.widgetLayouts
        .where('widgetInstanceId')
        .equals(widgetInstanceId)
        .and((item) => item.breakpoint === breakpoint)
        .delete();
    } else {
      await this.database.widgetLayouts
        .where('widgetInstanceId')
        .equals(widgetInstanceId)
        .delete();
    }
  }

  /**
   * Deletes all layout records belonging to a workspace across all breakpoints.
   */
  async deleteLayoutsByWorkspace(workspaceId: string): Promise<void> {
    if (!workspaceId) return;
    await this.database.widgetLayouts
      .where('workspaceId')
      .equals(workspaceId)
      .delete();
  }

  /**
   * Resets layout for a given workspace and breakpoint without modifying widget configurations.
   */
  async resetLayout(
    workspaceId: string,
    breakpoint: Breakpoint = 'lg'
  ): Promise<WidgetLayoutEntity[]> {
    if (!workspaceId) throw new Error('workspaceId is required');

    // Retrieve active widget instances for this workspace
    const instances = await this.database.widgetInstances
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    // Generate fresh default layout positions
    const cleanLayouts = synchronizeLayout(workspaceId, breakpoint, instances, []);

    // Save back to database
    return this.saveLayouts(workspaceId, breakpoint, cleanLayouts);
  }
}

export const layoutRepo = new LayoutRepository();
