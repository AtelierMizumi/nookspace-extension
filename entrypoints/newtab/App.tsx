import React, { useState } from 'react';
import { Sparkles, Plus, LayoutGrid } from 'lucide-react';
import { AppShell } from '../../src/components/layout/AppShell';
import { WorkspaceHeader } from '../../src/components/layout/WorkspaceHeader';
import { WidgetRenderer } from '../../src/features/widget-system/WidgetRenderer';
import { WidgetLibraryModal } from '../../src/features/widget-system/WidgetLibraryModal';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Modal } from '../../src/components/ui/Modal';
import { Input } from '../../src/components/ui/Input';
import { Switch } from '../../src/components/ui/Switch';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { useWidgetStore } from '../../src/stores/widgetStore';
// Ensure all initial widgets are registered
import '../../src/widgets';

export const App: React.FC = () => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);

  const { activeWorkspaceId, getActiveWorkspace } = useWorkspaceStore();
  const { instances, addWidget, removeWidget, toggleWidget, updateConfig } = useWidgetStore();

  const currentWorkspace = getActiveWorkspace();

  return (
    <AppShell
      isEditMode={isEditMode}
      onToggleEditMode={() => setIsEditMode(!isEditMode)}
      onOpenSettings={() => setIsSettingsOpen(true)}
    >
      {/* Workspace Header (Time & Dynamic Greeting) */}
      <WorkspaceHeader userName="Architect" />

      {/* Edit Mode Notification Banner */}
      {isEditMode && (
        <div className="w-full mb-6 p-3 rounded-lg border border-primary/30 bg-primary/10 text-primary flex items-center justify-between text-xs animate-in fade-in duration-150 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              Edit Mode: Customize your dashboard widgets. Drag-and-drop 12-column grid engine launches in Phase 3.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsLibraryOpen(true)} leftIcon={<Plus className="h-3 w-3" />}>
              Add Widget
            </Button>
            <Button size="sm" variant="primary" onClick={() => setIsEditMode(false)}>
              Save Layout
            </Button>
          </div>
        </div>
      )}

      {/* Responsive Dashboard Grid Area */}
      <section className="flex-1 w-full pb-8">
        {instances.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {instances.map((instance) => (
              <div key={instance.id} className="min-h-[190px]">
                <WidgetRenderer
                  instance={instance}
                  isEditMode={isEditMode}
                  onUpdateConfig={(newConfig) =>
                    updateConfig(instance.id, newConfig, activeWorkspaceId)
                  }
                  onRemove={() => removeWidget(instance.id, activeWorkspaceId)}
                  onToggleEnabled={() =>
                    toggleWidget(instance.id, !instance.isEnabled, activeWorkspaceId)
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Widget Library Modal */}
      <WidgetLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        workspaceId={activeWorkspaceId}
        activeInstances={instances}
        onAddWidget={(type) => addWidget(activeWorkspaceId, type)}
        onRemoveWidget={(id) => removeWidget(id, activeWorkspaceId)}
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
            <label className="font-medium text-foreground block mb-1">Total Installed Widgets</label>
            <Input value={`${instances.length} active instances`} readOnly disabled />
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
