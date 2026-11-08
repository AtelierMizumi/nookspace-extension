import { db, NookSpaceDB } from '../db';
import {
  WorkspaceEntity,
  CreateWorkspaceInput,
  CreateWorkspaceInputSchema,
  UpdateWorkspaceInput,
  UpdateWorkspaceInputSchema,
  WorkspaceInput,
  WorkspaceInputSchema,
} from '../../../types/workspaces';
import { WidgetInstanceEntity, WidgetLayoutEntity } from '../../../types/database';

export {
  WorkspaceInputSchema,
  CreateWorkspaceInputSchema,
  UpdateWorkspaceInputSchema,
};
export type { WorkspaceInput, CreateWorkspaceInput, UpdateWorkspaceInput };

export class WorkspaceRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves all workspaces sorted deterministically by order ascending.
   */
  async getAll(): Promise<WorkspaceEntity[]> {
    return this.database.workspaces.orderBy('order').toArray();
  }

  /**
   * Retrieves a single workspace by ID.
   */
  async getById(id: string): Promise<WorkspaceEntity | undefined> {
    return this.database.workspaces.get(id);
  }

  /**
   * Retrieves the default root workspace, or the first one ordered.
   */
  async getDefault(): Promise<WorkspaceEntity | undefined> {
    const all = await this.getAll();
    const defaultWs = all.find((w) => w.isDefault);
    if (defaultWs) return defaultWs;
    return all[0];
  }

  /**
   * Creates a new workspace with Zod validation and sequential order.
   */
  async create(input: CreateWorkspaceInput): Promise<WorkspaceEntity> {
    const validated = CreateWorkspaceInputSchema.parse(input);
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

  /**
   * Updates an existing workspace. Validates mutable fields and updates updatedAt.
   * Preserves immutable fields (id, isDefault, createdAt).
   */
  async update(id: string, updates: UpdateWorkspaceInput): Promise<WorkspaceEntity> {
    const validated = UpdateWorkspaceInputSchema.parse(updates);
    const existing = await this.database.workspaces.get(id);
    if (!existing) {
      throw new Error(`Workspace with id "${id}" not found`);
    }

    const now = Date.now();
    const updatedEntity: WorkspaceEntity = {
      ...existing,
      ...(validated.name !== undefined ? { name: validated.name } : {}),
      ...(validated.icon !== undefined ? { icon: validated.icon } : {}),
      ...(validated.color !== undefined
        ? { color: validated.color === null ? undefined : validated.color }
        : {}),
      ...(validated.order !== undefined ? { order: validated.order } : {}),
      updatedAt: now,
    };

    await this.database.workspaces.put(updatedEntity);
    return updatedEntity;
  }

  /**
   * Reorders all workspaces deterministically inside a single Dexie transaction.
   * Requires a complete permutation of all existing workspace IDs without duplicates.
   */
  async reorder(orderedIds: string[]): Promise<void> {
    // 1. Duplicate check
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new Error('Invalid reorder request: Duplicate IDs detected in orderedIds');
    }

    // 2. Complete permutation check
    const all = await this.getAll();
    if (orderedIds.length !== all.length) {
      throw new Error(
        `Invalid reorder request: Expected complete permutation of all ${all.length} workspaces (received ${orderedIds.length})`
      );
    }

    const existingIds = new Set(all.map((w) => w.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Invalid reorder request: Workspace with id "${id}" not found`);
      }
    }

    // 3. Atomic transaction
    await this.database.transaction('rw', this.database.workspaces, async () => {
      const now = Date.now();
      for (let i = 0; i < orderedIds.length; i++) {
        await this.database.workspaces.update(orderedIds[i], {
          order: i,
          updatedAt: now,
        });
      }
    });
  }

  /**
   * Safely deletes a workspace and all its workspace-scoped records across all tables
   * in a single atomic transaction. Prevents deleting the last remaining workspace.
   */
  async delete(id: string): Promise<void> {
    const count = await this.database.workspaces.count();
    if (count <= 1) {
      throw new Error('Cannot delete the only remaining workspace.');
    }

    const target = await this.database.workspaces.get(id);
    if (!target) {
      throw new Error(`Workspace with id "${id}" not found`);
    }

    // Tables that hold workspace-scoped records
    const tables = [
      this.database.workspaces,
      this.database.settings,
      this.database.widgetInstances,
      this.database.widgetLayouts,
      this.database.notes,
      this.database.noteCollections,
      this.database.noteTags,
      this.database.noteBookmarkLinks,
      this.database.bookmarks,
      this.database.bookmarkGroups,
      this.database.todos,
      this.database.focusSessions,
      this.database.dailyGoals,
      this.database.calendarEvents,
      this.database.stickyNotes,
      this.database.vocabulary,
      this.database.resources,
    ];

    await this.database.transaction('rw', tables, async () => {
      // 1. Delete all workspace-scoped records in secondary tables
      const scopedTables = [
        this.database.widgetInstances,
        this.database.widgetLayouts,
        this.database.notes,
        this.database.noteCollections,
        this.database.noteTags,
        this.database.noteBookmarkLinks,
        this.database.bookmarks,
        this.database.bookmarkGroups,
        this.database.todos,
        this.database.focusSessions,
        this.database.dailyGoals,
        this.database.calendarEvents,
        this.database.stickyNotes,
        this.database.vocabulary,
        this.database.resources,
      ];

      for (const table of scopedTables) {
        const keys = await table.where('workspaceId').equals(id).primaryKeys();
        if (keys.length > 0) {
          await table.bulkDelete(keys as any[]);
        }
      }

      // 2. Delete workspace itself
      await this.database.workspaces.delete(id);

      // 3. If target was default, assign next in order as new default
      if (target.isDefault) {
        const remaining = await this.database.workspaces.orderBy('order').first();
        if (remaining) {
          await this.database.workspaces.update(remaining.id, {
            isDefault: true,
            updatedAt: Date.now(),
          });
        }
      }

      // 4. Update activeWorkspaceId in settings if target was active
      const settings = await this.database.settings.get('current_settings');
      if (settings && settings.activeWorkspaceId === id) {
        const remaining = await this.database.workspaces.orderBy('order').first();
        if (remaining) {
          await this.database.settings.update('current_settings', {
            activeWorkspaceId: remaining.id,
            updatedAt: Date.now(),
          });
        }
      }
    });
  }

  /**
   * Duplicates a workspace's dashboard structure ONLY (workspace metadata, widget instances,
   * and widget layouts). Live user data (notes, bookmarks, tasks, etc.) is NEVER duplicated.
   */
  async duplicate(id: string): Promise<WorkspaceEntity> {
    const original = await this.database.workspaces.get(id);
    if (!original) {
      throw new Error(`Workspace with id "${id}" not found`);
    }

    const count = await this.database.workspaces.count();
    const now = Date.now();
    const newWorkspaceId = `ws-${now}-${Math.random().toString(36).substring(2, 7)}`;
    const newName = `${original.name} (Copy)`.slice(0, 50);

    const newWorkspace: WorkspaceEntity = {
      id: newWorkspaceId,
      name: newName,
      icon: original.icon,
      color: original.color,
      isDefault: false,
      order: count,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Fetch source widget instances
    const sourceInstances = await this.database.widgetInstances
      .where('workspaceId')
      .equals(id)
      .toArray();

    // Map old instanceId -> new instanceId
    const instanceIdMap = new Map<string, string>();
    const newInstances: WidgetInstanceEntity[] = sourceInstances.map((inst, index) => {
      const newInstanceId = `wi-${now}-${Math.random().toString(36).substring(2, 7)}-${index}`;
      instanceIdMap.set(inst.id, newInstanceId);
      return {
        id: newInstanceId,
        workspaceId: newWorkspaceId,
        widgetType: inst.widgetType,
        title: inst.title,
        config: JSON.parse(JSON.stringify(inst.config || {})),
        isEnabled: inst.isEnabled,
        order: inst.order,
        createdAt: now,
        updatedAt: now,
      };
    });

    // 2. Fetch source widget layouts
    const sourceLayouts = await this.database.widgetLayouts
      .where('workspaceId')
      .equals(id)
      .toArray();

    const newLayouts: WidgetLayoutEntity[] = [];
    for (const layout of sourceLayouts) {
      const newInstanceId = instanceIdMap.get(layout.widgetInstanceId);
      if (newInstanceId) {
        newLayouts.push({
          id: `${newWorkspaceId}_${newInstanceId}_${layout.breakpoint}`,
          workspaceId: newWorkspaceId,
          widgetInstanceId: newInstanceId,
          breakpoint: layout.breakpoint,
          x: layout.x,
          y: layout.y,
          w: layout.w,
          h: layout.h,
          minW: layout.minW,
          minH: layout.minH,
          maxW: layout.maxW,
          maxH: layout.maxH,
          isDefault: layout.isDefault,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 3. Atomic transaction persisting duplicated workspace, instances, and layouts
    await this.database.transaction(
      'rw',
      [this.database.workspaces, this.database.widgetInstances, this.database.widgetLayouts],
      async () => {
        await this.database.workspaces.add(newWorkspace);
        if (newInstances.length > 0) {
          await this.database.widgetInstances.bulkAdd(newInstances);
        }
        if (newLayouts.length > 0) {
          await this.database.widgetLayouts.bulkAdd(newLayouts);
        }
      }
    );

    return newWorkspace;
  }
}

export const workspaceRepo = new WorkspaceRepository();
