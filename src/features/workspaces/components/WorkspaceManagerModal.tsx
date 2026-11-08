import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Copy,
  Trash2,
  Plus,
  Check,
  Star,
  Layers,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button, IconButton } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useCustomizationStore } from '../../../stores/customizationStore';
import { WorkspaceEntity } from '../../../types/workspaces';
import { getWorkspaceIcon } from './WorkspaceIconPicker';
import { WorkspaceFormModal } from './WorkspaceFormModal';
import { WorkspaceDuplicateDialog } from './WorkspaceDuplicateDialog';
import { WorkspaceDeleteDialog } from './WorkspaceDeleteDialog';

export interface WorkspaceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreate?: () => void;
}

export const WorkspaceManagerModal: React.FC<WorkspaceManagerModalProps> = ({
  isOpen,
  onClose,
  onOpenCreate,
}) => {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    createWorkspaceFromPreset,
    updateWorkspace,
    reorderWorkspaces,
    duplicateWorkspace,
    deleteWorkspace,
  } = useWorkspaceStore();

  const requestWorkspaceSwitch = useCustomizationStore((s) => s.requestWorkspaceSwitch);

  // Child modal states
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceEntity | null>(null);
  const [duplicatingWorkspace, setDuplicatingWorkspace] = useState<WorkspaceEntity | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<WorkspaceEntity | null>(null);
  const [isInternalCreateOpen, setIsInternalCreateOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Workspaces sorted by order
  const sortedWorkspaces = [...workspaces].sort((a, b) => a.order - b.order);

  const handleSwitchWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return;
    const canSwitch = requestWorkspaceSwitch(workspaceId);
    if (canSwitch === 'ALLOW') {
      setActiveWorkspace(workspaceId);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0 || isReordering) return;
    setIsReordering(true);
    try {
      const ids = sortedWorkspaces.map((w) => w.id);
      const temp = ids[index];
      ids[index] = ids[index - 1];
      ids[index - 1] = temp;
      await reorderWorkspaces(ids);
    } finally {
      setIsReordering(false);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= sortedWorkspaces.length - 1 || isReordering) return;
    setIsReordering(true);
    try {
      const ids = sortedWorkspaces.map((w) => w.id);
      const temp = ids[index];
      ids[index] = ids[index + 1];
      ids[index + 1] = temp;
      await reorderWorkspaces(ids);
    } finally {
      setIsReordering(false);
    }
  };

  const handleCreateSubmit = async (data: {
    name: string;
    icon: string;
    color?: string;
    presetId?: string | null;
  }) => {
    if (data.presetId) {
      await createWorkspaceFromPreset({
        presetId: data.presetId,
        name: data.name,
        icon: data.icon,
        color: data.color,
      });
    } else {
      await createWorkspace(data.name, data.icon, data.color);
    }
    setIsInternalCreateOpen(false);
  };

  const handleEditSubmit = async (
    id: string,
    data: { name: string; icon: string; color: string | null }
  ) => {
    await updateWorkspace(id, {
      name: data.name,
      icon: data.icon,
      color: data.color ?? undefined,
    });
    setEditingWorkspace(null);
  };

  const handleDuplicateSubmit = async (workspaceId: string) => {
    await duplicateWorkspace(workspaceId);
    setDuplicatingWorkspace(null);
  };

  const handleDeleteSubmit = async (workspaceId: string) => {
    await deleteWorkspace(workspaceId);
    setDeletingWorkspace(null);
  };

  const handleTriggerCreate = () => {
    if (onOpenCreate) {
      onOpenCreate();
    } else {
      setIsInternalCreateOpen(true);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Layers className="h-5 w-5 text-primary" />
            <span>Manage Workspaces</span>
          </div>
        }
        description="Organize, customize, reorder, or duplicate your workspaces."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerCreate}
              className="gap-1.5 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Workspace</span>
            </Button>
            <Button variant="primary" size="sm" onClick={onClose} className="focus-visible:ring-2 focus-visible:ring-primary">
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-2 py-1 max-h-[60vh] overflow-y-auto pr-1">
          {sortedWorkspaces.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No workspaces found.
            </div>
          ) : (
            sortedWorkspaces.map((workspace, index) => {
              const IconComponent = getWorkspaceIcon(workspace.icon);
              const isActive = workspace.id === activeWorkspaceId;
              const isFirst = index === 0;
              const isLast = index === sortedWorkspaces.length - 1;

              return (
                <div
                  key={workspace.id}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'border-primary/50 bg-primary/5 shadow-xs'
                      : 'border-border/60 bg-card/60 hover:border-border hover:bg-secondary/30'
                  }`}
                >
                  {/* Left: Reorder up/down + Icon + Details */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="flex flex-col gap-0.5 shrink-0" role="group" aria-label={`Reorder ${workspace.name}`}>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Move ${workspace.name} up`}
                        disabled={isFirst || isReordering}
                        onClick={() => handleMoveUp(index)}
                        className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-20 focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Move ${workspace.name} down`}
                        disabled={isLast || isReordering}
                        onClick={() => handleMoveDown(index)}
                        className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-20 focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>

                    {/* Icon badge */}
                    <div
                      className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 shadow-xs border border-border/40"
                      style={{
                        backgroundColor: workspace.color ? `${workspace.color}1a` : 'var(--secondary)',
                        color: workspace.color || 'var(--primary)',
                      }}
                      aria-hidden="true"
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Workspace name and badges */}
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSwitchWorkspace(workspace.id)}
                          className="font-medium text-xs sm:text-sm text-foreground hover:underline truncate text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs"
                          title={`Switch to ${workspace.name}`}
                        >
                          {workspace.name}
                        </button>
                        {isActive && (
                          <Badge variant="default" size="sm" className="gap-1 px-1.5 py-0 text-[10px]">
                            <Check className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                        {workspace.isDefault && (
                          <Badge variant="secondary" size="sm" className="gap-1 px-1.5 py-0 text-[10px]">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {workspace.isDefault ? 'Default workspace' : 'Custom dashboard workspace'}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions: Switch, Edit, Duplicate, Delete */}
                  <div className="flex items-center gap-1 shrink-0 ml-2 sm:ml-3">
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSwitchWorkspace(workspace.id)}
                        aria-label={`Switch to ${workspace.name}`}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        Switch
                      </Button>
                    )}

                    <Tooltip content="Edit workspace" position="top">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Edit ${workspace.name}`}
                        onClick={() => setEditingWorkspace(workspace)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip content="Duplicate workspace" position="top">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Duplicate ${workspace.name}`}
                        onClick={() => setDuplicatingWorkspace(workspace)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip
                      content={
                        sortedWorkspaces.length <= 1
                          ? 'Cannot delete the only workspace'
                          : 'Delete workspace'
                      }
                      position="top"
                    >
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${workspace.name}`}
                        disabled={sortedWorkspaces.length <= 1}
                        onClick={() => setDeletingWorkspace(workspace)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 focus-visible:ring-1 focus-visible:ring-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* Internal Create Workspace Modal */}
      <WorkspaceFormModal
        isOpen={isInternalCreateOpen}
        onClose={() => setIsInternalCreateOpen(false)}
        mode="create"
        onSubmitCreate={handleCreateSubmit}
      />

      {/* Edit Workspace Modal */}
      <WorkspaceFormModal
        isOpen={editingWorkspace !== null}
        onClose={() => setEditingWorkspace(null)}
        mode="edit"
        initialWorkspace={editingWorkspace}
        onSubmitEdit={handleEditSubmit}
      />

      {/* Duplicate Dialog */}
      <WorkspaceDuplicateDialog
        isOpen={duplicatingWorkspace !== null}
        onClose={() => setDuplicatingWorkspace(null)}
        workspace={duplicatingWorkspace}
        onConfirmDuplicate={handleDuplicateSubmit}
      />

      {/* Delete Dialog */}
      <WorkspaceDeleteDialog
        isOpen={deletingWorkspace !== null}
        onClose={() => setDeletingWorkspace(null)}
        workspace={deletingWorkspace}
        totalWorkspacesCount={sortedWorkspaces.length}
        isActiveWorkspace={deletingWorkspace?.id === activeWorkspaceId}
        onConfirmDelete={handleDeleteSubmit}
      />
    </>
  );
};
