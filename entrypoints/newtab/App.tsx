import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid } from 'lucide-react';
import { AppShell } from '../../src/components/layout/AppShell';
import { WorkspaceHeader } from '../../src/components/layout/WorkspaceHeader';
import { GridLayoutEngine } from '../../src/features/layout-editor/GridLayoutEngine';
import { CustomizationToolbar } from '../../src/features/layout-editor/CustomizationToolbar';
import { WidgetLibraryModal } from '../../src/features/widget-system/WidgetLibraryModal';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Modal } from '../../src/components/ui/Modal';
import { Input } from '../../src/components/ui/Input';
import { Switch } from '../../src/components/ui/Switch';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { useWidgetStore } from '../../src/stores/widgetStore';
import { useLayoutStore } from '../../src/stores/layoutStore';
import { useCustomizationStore } from '../../src/stores/customizationStore';
import { widgetRegistry } from '../../src/features/widget-system/WidgetRegistry';
import { synchronizeLayout } from '../../src/features/layout-editor/layoutUtils';
import { Breakpoint, WidgetLayoutEntity, WidgetInstanceEntity } from '../../src/types/database';
// Ensure all initial widgets are registered
import '../../src/widgets';

export const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);

  const { activeWorkspaceId, getActiveWorkspace } = useWorkspaceStore();
  const { instances, addWidget, removeWidget, toggleWidget, updateConfig } = useWidgetStore();
  const {
    layouts,
    currentBreakpoint,
    loadLayouts,
    updateLayoutsInMemory,
    debouncedSaveLayouts,
  } = useLayoutStore();

  const isEditMode = useCustomizationStore((s) => s.isEditMode);
  const currentEditingLayouts = useCustomizationStore((s) => s.currentLayouts);
  const enterEditMode = useCustomizationStore((s) => s.enterEditMode);
  const commitEditMode = useCustomizationStore((s) => s.commitEditMode);
  const updateEditingLayouts = useCustomizationStore((s) => s.updateEditingLayouts);
  const stageDeleteWidget = useCustomizationStore((s) => s.stageDeleteWidget);
  const stageAddWidget = useCustomizationStore((s) => s.stageAddWidget);
  const stagedAddedInstances = useCustomizationStore((s) => s.stagedAddedInstances);
  const isWidgetStagedForDeletion = useCustomizationStore((s) => s.isWidgetStagedForDeletion);

  const currentWorkspace = getActiveWorkspace();

  // Load layout whenever active workspace or instances change
  useEffect(() => {
    if (activeWorkspaceId && instances.length > 0 && !isEditMode) {
      loadLayouts(activeWorkspaceId, currentBreakpoint);
    }
  }, [activeWorkspaceId, instances.length, currentBreakpoint, loadLayouts, isEditMode]);

  const handleAddWidget = async (type: string) => {
    if (isEditMode) {
      const definition = widgetRegistry.get(type);
      const instanceId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `wi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newInstance: WidgetInstanceEntity = {
        id: instanceId,
        workspaceId: activeWorkspaceId,
        widgetType: type,
        title: definition?.name || type,
        config: definition?.defaultConfig || {},
        isEnabled: true,
        order: instances.length + stagedAddedInstances.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Allocate initial layout across 5 breakpoints and stage addition
      const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
      const defaultLayouts: Partial<Record<Breakpoint, WidgetLayoutEntity>> = {};
      const allInstances = [...instances, ...stagedAddedInstances, newInstance];

      for (const bp of breakpoints) {
        const packed = synchronizeLayout(activeWorkspaceId, bp, allInstances, []);
        const item = packed.find((p) => p.widgetInstanceId === instanceId);
        if (item) defaultLayouts[bp] = item;
      }

      stageAddWidget(instanceId, defaultLayouts, newInstance);
    } else {
      await addWidget(activeWorkspaceId, type);
      await loadLayouts(activeWorkspaceId, currentBreakpoint);
    }
  };

  const handleRemoveWidget = async (id: string) => {
    if (isEditMode) {
      stageDeleteWidget(id);
    } else {
      await removeWidget(id, activeWorkspaceId);
      await loadLayouts(activeWorkspaceId, currentBreakpoint);
    }
  };

  const handleToggleEditMode = async () => {
    if (isEditMode) {
      const success = await commitEditMode(activeWorkspaceId);
      if (success) {
        await useWidgetStore.getState().loadWidgets(activeWorkspaceId);
        await loadLayouts(activeWorkspaceId, currentBreakpoint);
      }
    } else {
      await enterEditMode(activeWorkspaceId, currentBreakpoint);
    }
  };

  const visibleInstances = isEditMode
    ? [...instances, ...stagedAddedInstances].filter((inst) => !isWidgetStagedForDeletion(inst.id))
    : instances;

  const activeLayouts = isEditMode ? currentEditingLayouts : layouts;

  return (
    <AppShell
      isEditMode={isEditMode}
      onToggleEditMode={handleToggleEditMode}
      onOpenSettings={() => setIsSettingsOpen(true)}
    >
      {/* Workspace Header (Time & Dynamic Greeting) */}
      <WorkspaceHeader userName="Architect" />

      {/* Notion/Linear Style Customization Toolbar */}
      <CustomizationToolbar
        onAddWidget={() => setIsLibraryOpen(true)}
        activeBreakpoint={currentBreakpoint}
      />

      {/* Grid Engine Dashboard Viewport */}
      <section className="flex-1 w-full pb-8">
        {visibleInstances.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-6 w-6 text-primary" />}
            title="Your Workspace is Empty"
            description="Add widgets from the library to build your personal productivity dashboard."
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsLibraryOpen(true)}
              >
                Add Your First Widget
              </Button>
            }
            className="my-12 py-16"
          />
        ) : (
          <GridLayoutEngine
            workspaceId={activeWorkspaceId}
            widgets={visibleInstances}
            layouts={activeLayouts}
            currentBreakpoint={currentBreakpoint}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            isEditMode={isEditMode}
            onLayoutChange={isEditMode ? updateEditingLayouts : updateLayoutsInMemory}
            onDragStop={() => {
              if (!isEditMode) {
                debouncedSaveLayouts(activeWorkspaceId);
              }
            }}
            onResizeStop={() => {
              if (!isEditMode) {
                debouncedSaveLayouts(activeWorkspaceId);
              }
            }}
            onBreakpointChange={(newBp) => loadLayouts(activeWorkspaceId, newBp)}
            onUpdateConfig={(instanceId, newConfig) =>
              updateConfig(instanceId, newConfig, activeWorkspaceId)
            }
            onRemove={handleRemoveWidget}
            onToggleEnabled={(instanceId) => {
              const target = instances.find((i) => i.id === instanceId);
              if (target) {
                toggleWidget(instanceId, !target.isEnabled, activeWorkspaceId);
              }
            }}
          />
        )}
      </section>

      {/* Widget Library Modal */}
      <WidgetLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        workspaceId={activeWorkspaceId}
        activeInstances={visibleInstances}
        onAddWidget={handleAddWidget}
        onRemoveWidget={handleRemoveWidget}
      />

      {/* Preferences Dialog */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Preferences"
        description="Configure workspace settings and behavior."
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsSettingsOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-foreground block mb-1">Active Workspace</label>
            <Input value={currentWorkspace?.name || 'Personal Space'} readOnly disabled />
          </div>
          <div>
            <label className="font-medium text-foreground block mb-1">Grid Breakpoint</label>
            <Input value={`Current: ${currentBreakpoint.toUpperCase()}`} readOnly disabled />
          </div>
          <div className="pt-2">
            <Switch
              checked={true}
              onCheckedChange={() => {}}
              label="Local IndexedDB caching enabled"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};
