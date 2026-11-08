import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, HelpCircle } from 'lucide-react';
import { AppShell } from '../../src/components/layout/AppShell';
import { WorkspaceHeader } from '../../src/components/layout/WorkspaceHeader';
import { GridLayoutEngine } from '../../src/features/layout-editor/GridLayoutEngine';
import { CustomizationToolbar } from '../../src/features/layout-editor/CustomizationToolbar';
import { WidgetLibraryModal } from '../../src/features/widget-system/WidgetLibraryModal';
import { BookmarkManagerModal } from '../../src/features/bookmarks';
import {
  NotesManagerModal,
  useNoteStore,
  EVENT_OPEN_NOTES_MANAGER,
} from '../../src/features/notes';
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
import { useWorkspaceSync } from '../../src/features/workspaces';
import {
  RestoreModal,
  MergeImportModal,
  checkAndHandleStartupRecovery,
  backupExportService,
  downloadBackupFile,
} from '../../src/features/backup';
import { MigrationDiagnosticsModal } from '../../src/features/migrations';
import { BrowserIntegrationSection } from '../../src/features/preferences/components/BrowserIntegrationSection';
import { LanguageSection } from '../../src/features/preferences/components/LanguageSection';
import { SearchEngineSection } from '../../src/features/preferences/components/SearchEngineSection';
import { BackgroundSection } from '../../src/features/preferences/components/BackgroundSection';
import { UserGuideModal } from '../../src/features/user-guide';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useTranslation } from '../../src/services/i18n';
import { useAuthStore } from '../../src/features/account';
import { useSharedWorkspaceStore, SharedRoomDashboard } from '../../src/features/shared-workspace';
import { db } from '../../src/services/database/db';
// Ensure all initial widgets are registered
import '../../src/widgets';

export const App: React.FC = () => {
  useWorkspaceSync();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isBookmarkManagerOpen, setIsBookmarkManagerOpen] = useState<boolean>(false);
  const [isNotesManagerOpen, setIsNotesManagerOpen] = useState<boolean>(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState<boolean>(false);
  const [isMergeOpen, setIsMergeOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState<boolean>(false);

  const settings = useSettingsStore((s) => s.settings);
  const { initializeLanguage, t } = useTranslation();

  // Check for interrupted restore operations and handle startup recovery
  useEffect(() => {
    initializeLanguage();
    useAuthStore.getState().initialize().catch((err) => {
      console.warn('[App] Supabase auth initialize failed:', err);
    });
    checkAndHandleStartupRecovery(db).catch((err) => {
      console.warn('[App] Startup recovery check failed:', err);
    });
  }, [initializeLanguage]);

  const { activeWorkspaceId, getActiveWorkspace } = useWorkspaceStore();
  const activeSharedWs = useSharedWorkspaceStore((s) => s.activeSharedWorkspace);
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
    if (activeWorkspaceId && !isEditMode) {
      loadLayouts(activeWorkspaceId, currentBreakpoint);
    }
  }, [activeWorkspaceId, instances.length, currentBreakpoint, loadLayouts, isEditMode]);

  // Listen for open bookmark manager custom events triggered by widgets
  useEffect(() => {
    const handleOpenManager = () => {
      setIsBookmarkManagerOpen(true);
    };
    window.addEventListener('nookspace:open-bookmark-manager', handleOpenManager);
    return () => {
      window.removeEventListener('nookspace:open-bookmark-manager', handleOpenManager);
    };
  }, []);

  // Listen for open notes manager custom events
  useEffect(() => {
    const handleOpenNotes = (e: Event) => {
      setIsNotesManagerOpen(true);
      const customEvt = e as CustomEvent<{ noteId?: string; collectionId?: string | null }>;
      if (customEvt.detail?.noteId) {
        useNoteStore.getState().selectNote(customEvt.detail.noteId);
      }
      if (customEvt.detail?.collectionId !== undefined) {
        if (customEvt.detail.collectionId === null) {
          useNoteStore.getState().setViewFilter({ type: 'uncategorized' });
        } else {
          useNoteStore.getState().setViewFilter({
            type: 'collection',
            collectionId: customEvt.detail.collectionId,
          });
        }
      }
    };
    window.addEventListener(EVENT_OPEN_NOTES_MANAGER, handleOpenNotes);
    return () => {
      window.removeEventListener(EVENT_OPEN_NOTES_MANAGER, handleOpenNotes);
    };
  }, []);

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

      const editingLayoutsByBreakpoint =
        useCustomizationStore.getState().editingLayoutsByBreakpoint;

      for (const bp of breakpoints) {
        const existingForBp = editingLayoutsByBreakpoint[bp] || [];
        const packed = synchronizeLayout(activeWorkspaceId, bp, allInstances, existingForBp);
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
      isEditMode={isEditMode && !activeSharedWs}
      onToggleEditMode={handleToggleEditMode}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onOpenBookmarkManager={() => setIsBookmarkManagerOpen(true)}
      onOpenNotesManager={() => setIsNotesManagerOpen(true)}
      onOpenUserGuide={() => setIsUserGuideOpen(true)}
    >
      {activeSharedWs ? (
        <SharedRoomDashboard />
      ) : (
        <>
          {/* Workspace Header (Time & Dynamic Greeting) */}
          <WorkspaceHeader userName={settings?.userName || t('widgets.greeting.defaultName') || 'Explorer'} />

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
                title={t('appShell.emptyWorkspaceTitle') || 'Your Workspace is Empty'}
                description={
                  t('appShell.emptyWorkspaceDesc') ||
                  'Add widgets from the library to build your personal productivity dashboard.'
                }
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setIsLibraryOpen(true)}
                  >
                    {t('appShell.addFirstWidget') || 'Add Your First Widget'}
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
        </>
      )}

      {/* Widget Library Modal */}
      <WidgetLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        workspaceId={activeWorkspaceId}
        activeInstances={visibleInstances}
        onAddWidget={handleAddWidget}
        onRemoveWidget={handleRemoveWidget}
      />

      {/* Smart Bookmarks Manager Modal */}
      <BookmarkManagerModal
        isOpen={isBookmarkManagerOpen}
        onClose={() => setIsBookmarkManagerOpen(false)}
        workspaceId={activeWorkspaceId}
      />

      {/* Notes & Knowledge Manager Modal */}
      <NotesManagerModal
        isOpen={isNotesManagerOpen}
        onClose={() => setIsNotesManagerOpen(false)}
        workspaceId={activeWorkspaceId}
      />

      {/* Preferences Dialog */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={t('preferences.title')}
        description={t('preferences.description')}
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsSettingsOpen(false)}>
            {t('common.close')}
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-foreground block mb-1">
              {t('preferences.activeWorkspace')}
            </label>
            <Input value={currentWorkspace?.name || 'Personal Space'} readOnly disabled />
          </div>
          <div>
            <label className="font-medium text-foreground block mb-1">
              {t('preferences.gridBreakpoint')}
            </label>
            <Input
              value={t('preferences.currentBreakpoint', {
                breakpoint: currentBreakpoint.toUpperCase(),
              })}
              readOnly
              disabled
            />
          </div>
          <div className="pt-2">
            <Switch
              checked={true}
              onCheckedChange={() => {}}
              label={t('preferences.localCacheLabel')}
            />
          </div>
          <div className="pt-3 border-t border-border/40">
            <LanguageSection />
          </div>
          <div className="pt-3 border-t border-border/40">
            <SearchEngineSection />
          </div>
          <div className="pt-3 border-t border-border/40">
            <BackgroundSection />
          </div>
          <div className="pt-3 border-t border-border/40">
            <BrowserIntegrationSection />
          </div>
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    {t('userGuide.title')}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    {t('userGuide.subtitle')}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsUserGuideOpen(true);
                }}
                className="text-xs h-7 shrink-0"
              >
                {t('userGuide.openGuideBtn')}
              </Button>
            </div>
          </div>
          <div className="pt-3 border-t border-border/40 space-y-2">
            <span className="font-semibold text-foreground block">
              {t('preferences.backup.title')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    const result = await backupExportService.createFullBackup();
                    if (result.backup) {
                      downloadBackupFile(result);
                    }
                  } catch (err) {
                    console.error('[App] Backup export failed:', err);
                  }
                }}
              >
                {t('preferences.backup.exportBtn')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsMergeOpen(true);
                }}
              >
                {t('preferences.backup.mergeBtn')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsRestoreOpen(true);
                }}
              >
                {t('preferences.backup.restoreBtn')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsDiagnosticsOpen(true);
                }}
              >
                {t('preferences.backup.diagnosticsBtn')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Universal Restore Modal */}
      <RestoreModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
      />

      {/* Universal Merge Import Modal */}
      <MergeImportModal
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
      />

      {/* Database & Migration Diagnostics Modal */}
      <MigrationDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* Comprehensive In-App User Guide Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
      />
    </AppShell>
  );
};
