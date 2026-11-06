import React, { useMemo, useState, useCallback, useRef } from 'react';
import RGL, { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import {
  Breakpoint,
  BREAKPOINT_COLUMNS,
  WidgetLayoutEntity,
  WidgetInstanceEntity,
} from '../../types/database';
import { WidgetRenderer } from '../widget-system/WidgetRenderer';
import { cn } from '../../utils/cn';

// Wrap Responsive Grid with WidthProvider for responsive measurement
const ResponsiveGridLayout = WidthProvider(Responsive);

export interface GridLayoutEngineProps {
  workspaceId: string;
  widgets: WidgetInstanceEntity[];
  layouts: WidgetLayoutEntity[];
  currentBreakpoint?: Breakpoint;
  isDraggable?: boolean;
  isResizable?: boolean;
  isEditMode?: boolean;
  rowHeight?: number;
  onLayoutChange?: (newLayouts: WidgetLayoutEntity[]) => void;
  onDragStop?: (newLayouts: WidgetLayoutEntity[]) => void;
  onResizeStop?: (newLayouts: WidgetLayoutEntity[]) => void;
  onBreakpointChange?: (newBreakpoint: Breakpoint) => void;
  onUpdateConfig: (instanceId: string, newConfig: Partial<Record<string, unknown>>) => void;
  onRemove: (instanceId: string) => void;
  onToggleEnabled: (instanceId: string) => void;
  className?: string;
}

const BREAKPOINT_CONFIG = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};

export const GridLayoutEngine: React.FC<GridLayoutEngineProps> = ({
  workspaceId,
  widgets,
  layouts,
  currentBreakpoint = 'lg',
  isDraggable = false,
  isResizable = false,
  isEditMode = false,
  rowHeight = 80,
  onLayoutChange,
  onDragStop,
  onResizeStop,
  onBreakpointChange,
  onUpdateConfig,
  onRemove,
  onToggleEnabled,
  className,
}) => {
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>(currentBreakpoint);
  const activeBreakpointRef = useRef<Breakpoint>(currentBreakpoint);
  activeBreakpointRef.current = activeBreakpoint;

  // Transform typed WidgetLayoutEntity[] into react-grid-layout's Layout[]
  const rglLayouts = useMemo(() => {
    const layoutItems: Layout[] = layouts.map((item) => ({
      i: item.widgetInstanceId,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW || 2,
      minH: item.minH || 2,
      maxW: item.maxW,
      maxH: item.maxH,
      isDraggable: isEditMode && isDraggable,
      isResizable: isEditMode && isResizable,
    }));

    return {
      [activeBreakpoint]: layoutItems,
    };
  }, [layouts, activeBreakpoint, isEditMode, isDraggable, isResizable]);

  // Convert raw RGL Layout[] back into typed WidgetLayoutEntity[]
  const convertRglToEntities = useCallback(
    (currentRglLayout: Layout[], bp: Breakpoint): WidgetLayoutEntity[] => {
      const now = Date.now();
      const existingMap = new Map(layouts.map((l) => [l.widgetInstanceId, l]));

      return currentRglLayout.map((item) => {
        const existing = existingMap.get(item.i);
        return {
          id: existing?.id || `${workspaceId}_${item.i}_${bp}`,
          workspaceId,
          widgetInstanceId: item.i,
          breakpoint: bp,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH,
          maxW: item.maxW,
          maxH: item.maxH,
          isDefault: existing?.isDefault ?? false,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
      });
    },
    [workspaceId, layouts]
  );

  const handleRglLayoutChange = useCallback(
    (currentRglLayout: Layout[]) => {
      if (!onLayoutChange) return;
      const entities = convertRglToEntities(currentRglLayout, activeBreakpointRef.current);
      onLayoutChange(entities);
    },
    [convertRglToEntities, onLayoutChange]
  );

  const handleDragStop = useCallback(
    (currentRglLayout: Layout[]) => {
      if (!onDragStop) return;
      const entities = convertRglToEntities(currentRglLayout, activeBreakpointRef.current);
      onDragStop(entities);
    },
    [convertRglToEntities, onDragStop]
  );

  const handleResizeStop = useCallback(
    (currentRglLayout: Layout[]) => {
      if (!onResizeStop) return;
      const entities = convertRglToEntities(currentRglLayout, activeBreakpointRef.current);
      onResizeStop(entities);
    },
    [convertRglToEntities, onResizeStop]
  );

  const handleBreakpointChange = useCallback(
    (newBpStr: string) => {
      const bp = newBpStr as Breakpoint;
      setActiveBreakpoint(bp);
      activeBreakpointRef.current = bp;
      onBreakpointChange?.(bp);
    },
    [onBreakpointChange]
  );

  // Filter widget instances so we only render widgets that belong to active workspace
  const activeWidgets = useMemo(() => {
    return widgets.filter((w) => w.workspaceId === workspaceId);
  }, [widgets, workspaceId]);

  return (
    <div
      className={cn(
        'w-full transition-all duration-200 select-none',
        isEditMode && 'bg-secondary/15 rounded-2xl p-2 border border-dashed border-primary/20',
        className
      )}
    >
      <ResponsiveGridLayout
        className="layout"
        layouts={rglLayouts}
        breakpoints={BREAKPOINT_CONFIG}
        cols={BREAKPOINT_COLUMNS}
        rowHeight={rowHeight}
        isDraggable={isEditMode && isDraggable}
        isResizable={isEditMode && isResizable}
        draggableHandle=".widget-drag-handle"
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        onLayoutChange={handleRglLayoutChange}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        onBreakpointChange={handleBreakpointChange}
      >
        {activeWidgets.map((instance) => (
          <div key={instance.id} className="h-full w-full">
            <WidgetRenderer
              instance={instance}
              isEditMode={isEditMode}
              onUpdateConfig={(newConfig) => onUpdateConfig(instance.id, newConfig)}
              onRemove={() => onRemove(instance.id)}
              onToggleEnabled={() => onToggleEnabled(instance.id)}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};
