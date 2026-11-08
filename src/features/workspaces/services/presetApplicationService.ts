import { z } from 'zod';
import { db, NookSpaceDB } from '../../../services/database/db';
import { WorkspaceEntity, WorkspaceColorSchema } from '../../../types/workspaces';
import {
  Breakpoint,
  WidgetInstanceEntity,
  WidgetLayoutEntity,
} from '../../../types/database';
import { WidgetLayoutInputSchema } from '../../../services/database/repositories/layoutRepository';
import { widgetRegistry } from '../../widget-system/WidgetRegistry';
import { getPresetById } from '../presets/presetRegistry';
import { validateWorkspacePreset, PRESET_BREAKPOINTS } from '../presets/presetSchema';
import { WORKSPACE_ICONS } from '../components/WorkspaceIconPicker';

export const CreateWorkspaceFromPresetInputSchema = z
  .object({
    presetId: z.string().trim().min(1, 'Preset ID is required'),
    name: z
      .string()
      .trim()
      .min(1, 'Workspace name is required')
      .max(50, 'Workspace name must be 50 characters or less'),
    icon: z.string().trim().min(1, 'Icon cannot be empty').optional(),
    color: WorkspaceColorSchema.nullable().optional(),
  })
  .strict();

export type CreateWorkspaceFromPresetInput = z.input<
  typeof CreateWorkspaceFromPresetInputSchema
>;

export class PresetApplicationService {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Creates a new workspace from a built-in preset in a single atomic Dexie transaction.
   * Instantiates fresh widget instances and converts preset layouts across all 5 responsive breakpoints.
   * Guarantees zero user domain records are created or duplicated.
   */
  async createWorkspaceFromPreset(
    input: CreateWorkspaceFromPresetInput
  ): Promise<WorkspaceEntity> {
    // 1. Validate input schema
    const validatedInput = CreateWorkspaceFromPresetInputSchema.parse(input);

    // 2. Resolve preset by ID
    const preset = getPresetById(validatedInput.presetId);
    if (!preset) {
      throw new Error(`Unknown workspace preset: "${validatedInput.presetId}"`);
    }

    // 3. Validate preset definition integrity
    const validation = validateWorkspacePreset(preset);
    if (!validation.success) {
      throw new Error(`Invalid preset definition for "${preset.id}": ${validation.error}`);
    }

    // 4. Verify all referenced widget types exist in WidgetRegistry
    for (const widgetDef of preset.widgets) {
      const registered = widgetRegistry.get(widgetDef.widgetType);
      if (!registered) {
        throw new Error(
          `Unknown widget type "${widgetDef.widgetType}" referenced in preset "${preset.id}"`
        );
      }
    }

    // 5. Generate fresh IDs & timestamps
    const now = Date.now();
    const count = await this.database.workspaces.count();
    const workspaceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `ws-${crypto.randomUUID()}`
        : `ws-${now}-${Math.random().toString(36).substring(2, 7)}`;

    // Resolve icon and color overrides
    const chosenIcon = validatedInput.icon || preset.icon || 'LayoutGrid';
    if (!WORKSPACE_ICONS[chosenIcon]) {
      throw new Error(`Unknown workspace icon: "${chosenIcon}"`);
    }

    const chosenColor =
      validatedInput.color !== undefined
        ? validatedInput.color || undefined
        : preset.color || undefined;

    // 6. Construct WorkspaceEntity
    const workspaceEntity: WorkspaceEntity = {
      id: workspaceId,
      name: validatedInput.name,
      icon: chosenIcon,
      color: chosenColor,
      isDefault: count === 0,
      order: count,
      createdAt: now,
      updatedAt: now,
    };

    // 7. Construct fresh WidgetInstanceEntity records with deep-copied configurations
    const widgetInstances: WidgetInstanceEntity[] = [];
    const layoutEntities: WidgetLayoutEntity[] = [];

    preset.widgets.forEach((widgetDef, index) => {
      const instanceId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `wi-${crypto.randomUUID()}`
          : `wi-${now}-${Math.random().toString(36).substring(2, 7)}-${index}`;

      const registered = widgetRegistry.get(widgetDef.widgetType);
      const title = registered?.name || widgetDef.widgetType;

      // Deep copy configuration so it is independent and mutable
      const clonedConfig = JSON.parse(JSON.stringify(widgetDef.config || {}));

      const instance: WidgetInstanceEntity = {
        id: instanceId,
        workspaceId,
        widgetType: widgetDef.widgetType,
        title,
        config: clonedConfig,
        isEnabled: true,
        order: index,
        createdAt: now,
        updatedAt: now,
      };
      widgetInstances.push(instance);

      // 8. Convert preset layouts across all 5 responsive breakpoints
      for (const bp of PRESET_BREAKPOINTS) {
        const bpLayout = widgetDef.layout[bp];
        if (!bpLayout) {
          throw new Error(
            `Missing layout for breakpoint "${bp}" on widget "${widgetDef.widgetType}" in preset "${preset.id}"`
          );
        }

        const layoutEntity: WidgetLayoutEntity = {
          id: `${workspaceId}_${instanceId}_${bp}`,
          workspaceId,
          widgetInstanceId: instanceId,
          breakpoint: bp,
          x: bpLayout.x,
          y: bpLayout.y,
          w: bpLayout.w,
          h: bpLayout.h,
          minW: bpLayout.minW,
          minH: bpLayout.minH,
          maxW: bpLayout.maxW,
          maxH: bpLayout.maxH,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        };

        // Validate layout entity using existing repository schema
        WidgetLayoutInputSchema.parse(layoutEntity);
        layoutEntities.push(layoutEntity);
      }
    });

    // 9. Atomic persistence in a single Dexie transaction
    await this.database.transaction(
      'rw',
      [this.database.workspaces, this.database.widgetInstances, this.database.widgetLayouts],
      async () => {
        await this.database.workspaces.add(workspaceEntity);
        if (widgetInstances.length > 0) {
          await this.database.widgetInstances.bulkAdd(widgetInstances);
        }
        if (layoutEntities.length > 0) {
          await this.database.widgetLayouts.bulkAdd(layoutEntities);
        }
      }
    );

    return workspaceEntity;
  }
}

export const presetApplicationService = new PresetApplicationService();
