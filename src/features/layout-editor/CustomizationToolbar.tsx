import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  RotateCcw,
  Check,
  X,
  Sliders,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tooltip } from '../../components/ui/Tooltip';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../utils/cn';
import { useCustomizationStore } from '../../stores/customizationStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useWidgetStore } from '../../stores/widgetStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { synchronizeLayout } from './layoutUtils';
import { Breakpoint, WidgetLayoutEntity } from '../../types/database';

export interface CustomizationToolbarProps {
  isEditMode?: boolean;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  saveError?: string | null;
  activeBreakpoint?: string;
  onEnterEditMode?: () => void;
  onDone?: () => void;
  onCancel?: () => void;
  onAddWidget?: () => void;
  onResetLayout?: () => void;
  className?: string;
}

export const CustomizationToolbar: React.FC<CustomizationToolbarProps> = (props) => {
  // Store hooks
  const storeIsEditMode = useCustomizationStore((s) => s.isEditMode);
  const storeHasUnsavedChanges = useCustomizationStore((s) => s.hasUnsavedChanges);
  const storeIsSaving = useCustomizationStore((s) => s.isSaving);
  const storeSaveError = useCustomizationStore((s) => s.saveError);
  const storeBreakpoint = useCustomizationStore((s) => s.currentBreakpoint);
  const enterEditModeStore = useCustomizationStore((s) => s.enterEditMode);
  const cancelEditModeStore = useCustomizationStore((s) => s.cancelEditMode);
  const commitEditModeStore = useCustomizationStore((s) => s.commitEditMode);
  const resetEditingLayoutsStore = useCustomizationStore((s) => s.resetEditingLayouts);

  const isUnsavedPromptOpen = useCustomizationStore((s) => s.isUnsavedPromptOpen);
  const pendingWorkspaceSwitchId = useCustomizationStore((s) => s.pendingWorkspaceSwitchId);
  const forceDiscardAndSwitch = useCustomizationStore((s) => s.forceDiscardAndSwitchWorkspace);
  const closeUnsavedPrompt = useCustomizationStore((s) => s.closeUnsavedPrompt);

  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { instances, removeWidget } = useWidgetStore();

  // Dialog states
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Resolved values (prefer explicit prop if passed, fallback to store)
  const isEditMode = props.isEditMode !== undefined ? props.isEditMode : storeIsEditMode;
  const hasUnsavedChanges =
    props.hasUnsavedChanges !== undefined ? props.hasUnsavedChanges : storeHasUnsavedChanges;
  const isSaving = props.isSaving !== undefined ? props.isSaving : storeIsSaving;
  const saveError = props.saveError !== undefined ? props.saveError : storeSaveError;
  const activeBreakpoint = props.activeBreakpoint || storeBreakpoint;

  // Actions
  const handleEnterEditMode = () => {
    if (props.onEnterEditMode) {
      props.onEnterEditMode();
    } else if (activeWorkspaceId) {
      enterEditModeStore(activeWorkspaceId, storeBreakpoint);
    }
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setIsDiscardConfirmOpen(true);
    } else {
      executeCancel();
    }
  };

  const executeCancel = () => {
    setIsDiscardConfirmOpen(false);
    if (props.onCancel) {
      props.onCancel();
    } else {
      cancelEditModeStore();
      if (activeWorkspaceId) {
        useWidgetStore.getState().loadWidgets(activeWorkspaceId);
        useLayoutStore.getState().loadLayouts(activeWorkspaceId, storeBreakpoint);
      }
    }
  };

  const handleDoneClick = async () => {
    if (isSaving) return; // Prevent concurrent commits
    if (props.onDone) {
      props.onDone();
    } else if (activeWorkspaceId) {
      const success = await commitEditModeStore(activeWorkspaceId);
      if (success) {
        await useWidgetStore.getState().loadWidgets(activeWorkspaceId);
        await useLayoutStore.getState().loadLayouts(activeWorkspaceId, storeBreakpoint);
      }
    }
  };

  const handleResetClick = () => {
    setIsResetConfirmOpen(true);
  };

  const executeReset = () => {
    setIsResetConfirmOpen(false);
    if (props.onResetLayout) {
      props.onResetLayout();
    } else if (activeWorkspaceId) {
      const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
      const defaultMap: Record<Breakpoint, WidgetLayoutEntity[]> = {
        lg: [],
        md: [],
        sm: [],
        xs: [],
        xxs: [],
      };

      const stagedAdded = useCustomizationStore.getState().stagedAddedInstances;
      const isStagedDeleted = useCustomizationStore.getState().isWidgetStagedForDeletion;
      const allActiveInstances = [...instances, ...stagedAdded].filter(
        (i) => !isStagedDeleted(i.id)
      );

      for (const bp of breakpoints) {
        defaultMap[bp] = synchronizeLayout(activeWorkspaceId, bp, allActiveInstances, []);
      }

      resetEditingLayoutsStore(defaultMap);
    }
  };

  const handleConfirmWorkspaceSwitch = () => {
    if (pendingWorkspaceSwitchId) {
      forceDiscardAndSwitch(pendingWorkspaceSwitchId);
      setActiveWorkspace(pendingWorkspaceSwitchId);
    }
  };

  // Keyboard shortcut: Esc to cancel or trigger discard modal
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If any dialog is already open, allow the dialog's own handler to dismiss it
      if (isDiscardConfirmOpen || isResetConfirmOpen || isUnsavedPromptOpen) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, hasUnsavedChanges, isDiscardConfirmOpen, isResetConfirmOpen, isUnsavedPromptOpen]);

  // --- VIEW MODE ---
  if (!isEditMode) {
    return (
      <aside
        aria-label="Workspace View Mode Toolbar"
        className={cn(
          'w-full flex items-center justify-between py-2 px-1 mb-2 select-none transition-all',
          props.className
        )}
      >
        <div className="flex items-center gap-2">
          {activeBreakpoint && (
            <Badge variant="outline" size="sm" className="font-mono text-[10px] tracking-wide uppercase">
              Grid: {activeBreakpoint}
            </Badge>
          )}
        </div>

        <Tooltip content="Unlock dashboard to move, resize, and configure widgets" position="bottom">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnterEditMode}
            leftIcon={<Sliders className="h-3.5 w-3.5 text-primary" />}
            className="text-xs h-8 shadow-2xs font-medium"
          >
            Customize
          </Button>
        </Tooltip>
      </aside>
    );
  }

  // --- EDIT MODE ---
  return (
    <>
      <aside
        aria-label="Customization Studio Toolbar"
        className={cn(
          'w-full mb-6 p-2.5 sm:p-3 rounded-xl border border-primary/25 bg-card/90 backdrop-blur-md shadow-sm',
          'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3',
          'animate-in fade-in slide-in-from-top-1 duration-150',
          props.className
        )}
      >
        {/* Left: Status & Indicators */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-primary font-medium text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-semibold">Editing Dashboard</span>
            </span>
          </div>

          {hasUnsavedChanges ? (
            <Badge variant="warning" size="sm" className="text-[10px] py-0 px-2 font-medium">
              Changes are not saved yet
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm" className="text-[10px] py-0 px-2 font-normal text-muted-foreground">
              No changes
            </Badge>
          )}

          {activeBreakpoint && (
            <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase hidden md:inline-flex">
              {activeBreakpoint}
            </Badge>
          )}

          {saveError && (
            <div
              role="alert"
              className="flex items-center gap-1 text-[11px] text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-md"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[220px] truncate">{saveError}</span>
            </div>
          )}
        </div>

        {/* Right: Actions (Add Widget, Reset Layout, Cancel, Done) */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {/* 1. Add Widget */}
          <Tooltip content="Browse and add widgets to current layout" position="bottom">
            <Button
              size="sm"
              variant="secondary"
              onClick={props.onAddWidget}
              disabled={isSaving}
              leftIcon={<Plus className="h-3.5 w-3.5 text-primary" />}
              className="h-8 text-xs font-medium"
            >
              Add Widget
            </Button>
          </Tooltip>

          {/* 2. Reset Layout */}
          <Tooltip content="Rearrange all widgets to default packing positions" position="bottom">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetClick}
              disabled={isSaving}
              leftIcon={<RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />}
              className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Reset Layout
            </Button>
          </Tooltip>

          {/* 3. Cancel */}
          <Tooltip content="Discard all changes and exit (Esc)" position="bottom">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelClick}
              disabled={isSaving}
              leftIcon={<X className="h-3.5 w-3.5 text-muted-foreground" />}
              className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              Cancel
            </Button>
          </Tooltip>

          {/* 4. Done / Save */}
          <Tooltip content="Save layout changes to IndexedDB and exit edit mode" position="bottom">
            <Button
              size="sm"
              variant="primary"
              onClick={handleDoneClick}
              disabled={isSaving}
              isLoading={isSaving}
              leftIcon={
                isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )
              }
              className="h-8 text-xs font-medium min-w-[76px]"
            >
              {isSaving ? 'Saving...' : 'Done'}
            </Button>
          </Tooltip>
        </div>
      </aside>

      {/* Discard Changes on Cancel Modal */}
      <Modal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        title="Discard changes?"
        description="Your unsaved dashboard changes will be discarded."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiscardConfirmOpen(false)}
            >
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={executeCancel}
            >
              Discard Changes
            </Button>
          </div>
        }
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          All position and sizing modifications made during this editing session will be rolled back to your last saved state.
        </p>
      </Modal>

      {/* Reset Layout Confirmation Modal */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reset layout to default?"
        description="Rearrange widgets back to standard packing across all 5 responsive breakpoints."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
            >
              Keep Current Layout
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={executeReset}
            >
              Reset Layout
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            This action only repositions and resizes your widgets to default arrangement.
          </p>
          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50 text-foreground flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Zero Data Loss:</strong> Your notes, tasks, bookmarks, and widget configurations will remain completely safe and untouched.
            </span>
          </div>
        </div>
      </Modal>

      {/* Workspace Switch Safety Confirmation Modal */}
      <Modal
        isOpen={isUnsavedPromptOpen}
        onClose={closeUnsavedPrompt}
        title="Unsaved changes in workspace"
        description="You have unsaved changes in your dashboard layout."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={closeUnsavedPrompt}
            >
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmWorkspaceSwitch}
            >
              Discard & Switch
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            Switching workspaces now will discard any unsaved layout changes in this workspace.
          </p>
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              To preserve these changes, click <strong>Keep Editing</strong> and then click <strong>Done</strong> before switching.
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
};
