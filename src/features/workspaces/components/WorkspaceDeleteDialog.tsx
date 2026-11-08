import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { WorkspaceEntity } from '../../../types/workspaces';

export interface WorkspaceDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: WorkspaceEntity | null;
  totalWorkspacesCount: number;
  isActiveWorkspace: boolean;
  onConfirmDelete: (workspaceId: string) => Promise<void>;
}

export const WorkspaceDeleteDialog: React.FC<WorkspaceDeleteDialogProps> = ({
  isOpen,
  onClose,
  workspace,
  totalWorkspacesCount,
  isActiveWorkspace,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!workspace) return null;

  const isSoleWorkspace = totalWorkspacesCount <= 1;

  const handleDelete = async () => {
    if (isSoleWorkspace || isDeleting) return;

    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(workspace.id);
      setIsDeleting(false);
      onClose();
    } catch (err: unknown) {
      setIsDeleting(false);
      setError(err instanceof Error ? err.message : 'Failed to delete workspace.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title={
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Delete Workspace</span>
        </div>
      }
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isSoleWorkspace || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Workspace'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        <p className="text-foreground font-medium">
          Are you sure you want to delete <span className="font-semibold text-destructive">"{workspace.name}"</span>?
        </p>

        {isSoleWorkspace ? (
          <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[11px] leading-relaxed">
            Cannot delete the only remaining workspace. NookSpace requires at least one active workspace.
          </div>
        ) : (
          <div className="space-y-2 text-muted-foreground text-[11px] leading-relaxed">
            <p className="text-foreground/90 font-medium">
              This action is <strong className="text-destructive font-semibold">permanent and cannot be undone</strong>.
            </p>
            <p>
              Deleting this workspace will atomically remove its dashboard layout and all scoped records:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground/90">
              <li>Dashboard widgets and responsive grid positions</li>
              <li>Notes, collections, tags, and bookmark links</li>
              <li>Saved bookmarks and folders</li>
              <li>Todo tasks and daily goals</li>
              <li>Focus sessions and study records</li>
            </ul>

            {isActiveWorkspace && (
              <p className="pt-1 text-primary font-medium">
                ✦ Because this workspace is currently active, NookSpace will automatically switch to your default workspace.
              </p>
            )}

            {workspace.isDefault && (
              <p className="text-amber-500 font-medium">
                ✦ Because this is your default workspace, another workspace will be promoted to default.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-destructive text-[11px] bg-destructive/10 p-2 rounded border border-destructive/20 font-medium">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};
