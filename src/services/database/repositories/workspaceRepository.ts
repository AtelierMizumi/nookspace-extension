import { z } from 'zod';
import { db, NookSpaceDB } from '../db';
import { WorkspaceEntity } from '../../../types/database';

export const WorkspaceInputSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(50, 'Name must be 50 characters or less'),
  icon: z.string().default('LayoutGrid'),
  color: z.string().optional(),
});

export type WorkspaceInput = z.infer<typeof WorkspaceInputSchema>;

export class WorkspaceRepository {
  constructor(private database: NookSpaceDB = db) {}

  async getAll(): Promise<WorkspaceEntity[]> {
    return this.database.workspaces.orderBy('order').toArray();
  }

  async getById(id: string): Promise<WorkspaceEntity | undefined> {
    return this.database.workspaces.get(id);
  }

  async getDefault(): Promise<WorkspaceEntity | undefined> {
    const defaultWs = await this.database.workspaces.where('isDefault').equals(1 as any).first();
    if (defaultWs) return defaultWs;
    return this.database.workspaces.orderBy('order').first();
  }

  async create(input: WorkspaceInput): Promise<WorkspaceEntity> {
    const validated = WorkspaceInputSchema.parse(input);
    const count = await this.database.workspaces.count();
    const now = Date.now();
    const id = `ws-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const entity: WorkspaceEntity = {
      id,
      name: validated.name,
      icon: validated.icon || 'LayoutGrid',
      color: validated.color || '#6366f1',
      isDefault: count === 0,
      order: count,
      createdAt: now,
      updatedAt: now,
    };

    await this.database.workspaces.add(entity);
    return entity;
  }

  async update(id: string, updates: Partial<Pick<WorkspaceEntity, 'name' | 'icon' | 'color' | 'order'>>): Promise<void> {
    const existing = await this.database.workspaces.get(id);
    if (!existing) throw new Error(`Workspace with id ${id} not found`);

    if (updates.name !== undefined) {
      z.string().trim().min(1).max(50).parse(updates.name);
    }

    await this.database.workspaces.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    const count = await this.database.workspaces.count();
    if (count <= 1) {
      throw new Error('Cannot delete the only remaining workspace.');
    }

    const target = await this.database.workspaces.get(id);
    if (!target) return;

    await this.database.transaction('rw', [this.database.workspaces, this.database.settings], async () => {
      await this.database.workspaces.delete(id);

      // If we deleted the default or currently active workspace, re-assign default
      if (target.isDefault) {
        const next = await this.database.workspaces.orderBy('order').first();
        if (next) {
          await this.database.workspaces.update(next.id, { isDefault: true });
        }
      }
    });
  }

  async duplicate(id: string): Promise<WorkspaceEntity> {
    const original = await this.database.workspaces.get(id);
    if (!original) throw new Error(`Workspace with id ${id} not found`);

    return this.create({
      name: `${original.name} (Copy)`,
      icon: original.icon,
      color: original.color,
    });
  }
}

export const workspaceRepo = new WorkspaceRepository();
