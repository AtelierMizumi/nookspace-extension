import {
  Breakpoint,
  BREAKPOINT_COLUMNS,
  WidgetLayoutEntity,
  WidgetInstanceEntity,
} from '../../types/database';
import { widgetRegistry } from '../widget-system/WidgetRegistry';

/**
 * Checks whether a rectangle (x, y, w, h) can fit in a 2D occupancy grid
 * without colliding with existing widgets or overflowing the column limit.
 */
function canFit(
  grid: Set<string>,
  x: number,
  y: number,
  w: number,
  h: number,
  maxCols: number
): boolean {
  if (x + w > maxCols) return false;

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (grid.has(`${x + dx},${y + dy}`)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Marks cells in the occupancy grid as filled.
 */
function markOccupied(grid: Set<string>, x: number, y: number, w: number, h: number): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      grid.add(`${x + dx},${y + dy}`);
    }
  }
}

/**
 * Finds the first available (x, y) coordinates for a widget of size (w, h)
 * on a grid with a maximum column width.
 */
function findAvailablePosition(
  grid: Set<string>,
  w: number,
  h: number,
  maxCols: number
): { x: number; y: number } {
  let y = 0;
  while (y < 1000) {
    for (let x = 0; x <= maxCols - w; x++) {
      if (canFit(grid, x, y, w, h, maxCols)) {
        return { x, y };
      }
    }
    y++;
  }
  return { x: 0, y: 0 };
}

/**
 * Synchronizes layout entities with the active widget instances for a given workspace & breakpoint.
 *
 * Guarantees:
 * 1. Idempotency: Multiple calls with identical inputs yield identical layouts.
 * 2. Widget Isolation: Only considers widgets matching the given workspaceId.
 * 3. Breakpoint Isolation: Respects maximum column widths for each breakpoint.
 * 4. Existing Retention: Existing layout positions are preserved without unnecessary repositioning.
 * 5. Deterministic Packing: Newly added widgets are packed into the earliest available non-colliding slot.
 * 6. Orphan Purging: Layout records for removed widget instances are pruned.
 */
export function synchronizeLayout(
  workspaceId: string,
  breakpoint: Breakpoint,
  instances: WidgetInstanceEntity[],
  existingLayouts: WidgetLayoutEntity[] = []
): WidgetLayoutEntity[] {
  const maxCols = BREAKPOINT_COLUMNS[breakpoint] || 12;
  const validInstanceIds = new Set(instances.map((i) => i.id));
  const occupancyGrid = new Set<string>();
  const reconciled: WidgetLayoutEntity[] = [];
  const processedInstanceIds = new Set<string>();

  // 1. First pass: Retain and validate existing layouts for valid instances
  for (const layout of existingLayouts) {
    // Skip orphan layouts (widget instance was deleted) or mismatched workspace/breakpoint
    if (
      !validInstanceIds.has(layout.widgetInstanceId) ||
      layout.workspaceId !== workspaceId ||
      layout.breakpoint !== breakpoint
    ) {
      continue;
    }

    // Skip duplicate layout records for the same instance in this breakpoint
    if (processedInstanceIds.has(layout.widgetInstanceId)) {
      continue;
    }

    const definition = widgetRegistry.get(
      instances.find((i) => i.id === layout.widgetInstanceId)?.widgetType || ''
    );
    const minW = layout.minW || definition?.minDimensions.w || 1;
    const minH = layout.minH || definition?.minDimensions.h || 1;
    const maxW = layout.maxW || definition?.maxDimensions?.w;
    const maxH = layout.maxH || definition?.maxDimensions?.h;

    // Clamp width to breakpoint limit
    const w = Math.min(maxCols, Math.max(minW, layout.w));
    // Clamp x so it does not overflow
    const x = Math.min(maxCols - w, Math.max(0, layout.x));
    const y = Math.max(0, layout.y);
    const h = Math.max(minH, layout.h);

    const validRecord: WidgetLayoutEntity = {
      ...layout,
      x,
      y,
      w,
      h,
      minW,
      minH,
      maxW,
      maxH,
      updatedAt: layout.updatedAt || Date.now(),
    };

    reconciled.push(validRecord);
    markOccupied(occupancyGrid, x, y, w, h);
    processedInstanceIds.add(layout.widgetInstanceId);
  }

  // 2. Second pass: Calculate deterministic positions for newly added widget instances
  for (const instance of instances) {
    if (processedInstanceIds.has(instance.id)) {
      continue;
    }

    const definition = widgetRegistry.get(instance.widgetType);
    const defW = definition?.defaultDimensions.w || 4;
    const defH = definition?.defaultDimensions.h || 3;
    const minW = definition?.minDimensions.w || 2;
    const minH = definition?.minDimensions.h || 2;
    const maxW = definition?.maxDimensions?.w;
    const maxH = definition?.maxDimensions?.h;

    // Clamped width for this breakpoint
    const w = Math.min(maxCols, Math.max(minW, defW));
    const h = Math.max(minH, defH);

    const pos = findAvailablePosition(occupancyGrid, w, h, maxCols);
    markOccupied(occupancyGrid, pos.x, pos.y, w, h);

    const now = Date.now();
    const newRecord: WidgetLayoutEntity = {
      id: `${workspaceId}_${instance.id}_${breakpoint}`,
      workspaceId,
      widgetInstanceId: instance.id,
      breakpoint,
      x: pos.x,
      y: pos.y,
      w,
      h,
      minW,
      minH,
      maxW,
      maxH,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    };

    reconciled.push(newRecord);
    processedInstanceIds.add(instance.id);
  }

  return reconciled;
}
