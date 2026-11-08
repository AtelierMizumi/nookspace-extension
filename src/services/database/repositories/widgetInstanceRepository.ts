import { z } from 'zod';
import { db, NookSpaceDB } from '../db';
import { WidgetInstanceEntity } from '../../../types/database';

export const WidgetInstanceCreateSchema = z.object({
  workspaceId: z.string().min(1),
  widgetType: z.string().min(1),
  title: z.string().optional(),
  config: z.record(z.any()).optional().default({}),
});

export type WidgetInstanceCreateInput = z.input<typeof WidgetInstanceCreateSchema>;

export class WidgetInstanceRepository {
  constructor(private database: NookSpaceDB = db) {}

  async getByWorkspace(workspaceId: string): Promise<WidgetInstanceEntity[]> {
    return this.database.widgetInstances
      .where('workspaceId')
      .equals(workspaceId)
      .sortBy('order');
  }

  async getById(id: string): Promise<WidgetInstanceEntity | undefined> {
    return this.database.widgetInstances.get(id);
  }

  async create(input: WidgetInstanceCreateInput): Promise<WidgetInstanceEntity> {
    const validated = WidgetInstanceCreateSchema.parse(input);
    const existing = await this.getByWorkspace(validated.workspaceId);
    const now = Date.now();
    const id = `wi-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const entity: WidgetInstanceEntity = {
      id,
      workspaceId: validated.workspaceId,
      widgetType: validated.widgetType,
      title: validated.title,
      config: validated.config,
      isEnabled: true,
      order: existing.length,
      createdAt: now,
      updatedAt: now,
    };

    await this.database.widgetInstances.add(entity);
    return entity;
  }

  async updateConfig(id: string, config: Record<string, unknown>, workspaceId?: string): Promise<void> {
    const existing = await this.database.widgetInstances.get(id);
    if (!existing) throw new Error(`Widget instance with id ${id} not found`);
    if (workspaceId && existing.workspaceId !== workspaceId) {
      throw new Error(
        `Security Violation: Widget instance ${id} belongs to ${existing.workspaceId}, not ${workspaceId}`
      );
    }

    await this.database.widgetInstances.update(id, {
      config: { ...existing.config, ...config },
      updatedAt: Date.now(),
    });
  }

  async toggleEnabled(id: string, isEnabled: boolean, workspaceId?: string): Promise<void> {
    const existing = await this.database.widgetInstances.get(id);
    if (!existing) throw new Error(`Widget instance with id ${id} not found`);
    if (workspaceId && existing.workspaceId !== workspaceId) {
      throw new Error(
        `Security Violation: Widget instance ${id} belongs to ${existing.workspaceId}, not ${workspaceId}`
      );
    }

    await this.database.widgetInstances.update(id, {
      isEnabled,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string, workspaceId?: string): Promise<void> {
    if (workspaceId) {
      const existing = await this.database.widgetInstances.get(id);
      if (existing && existing.workspaceId !== workspaceId) {
        throw new Error(
          `Security Violation: Cannot delete widget ${id} belonging to another workspace (${existing.workspaceId})`
        );
      }
    }
    await this.database.widgetInstances.delete(id);
  }

  async reorder(workspaceId: string, orderedIds: string[]): Promise<void> {
    await this.database.transaction('rw', this.database.widgetInstances, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await this.database.widgetInstances.update(orderedIds[i], {
          order: i,
          updatedAt: Date.now(),
        });
      }
    });
  }
}

export const widgetInstanceRepo = new WidgetInstanceRepository();
