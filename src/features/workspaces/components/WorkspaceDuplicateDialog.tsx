import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { WorkspaceEntity } from '../../../types/workspaces';

export interface WorkspaceDuplicateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: WorkspaceEntity | null;
  onConfirmDuplicate: (workspaceId: string) => Promise<void>;
}

export const WorkspaceDuplicateDialog: React.FC<WorkspaceDuplicateDialogProps> = ({
  isOpen,
  onClose,
  workspace,
  onConfirmDuplicate,
}) => {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!workspace) return null;

  const handleDuplicate = async () => {
    if (isDuplicating) return;

    setIsDuplicating(true);
    setError(null);
    try {
      await onConfirmDuplicate(workspace.id);
      setIsDuplicating(false);
      onClose();
    } catch (err: unknown) {
      setIsDuplicating(false);
      setError(err instanceof Error ? err.message : 'Failed to duplicate workspace.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDuplicating) onClose();
      }}
      title={
        <div className="flex items-center gap-2 text-foreground">
          <Copy className="h-4 w-4 text-primary shrink-0" />
          <span>Duplicate Workspace</span>
        </div>
      }
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDuplicating}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDuplicate}
            disabled={isDuplicating}
          >
            {isDuplicating ? 'Duplicating...' : 'Duplicate Workspace'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        <p className="text-foreground">
          Create an independent copy of <span className="font-semibold text-primary">"{workspace.name}"</span>?
        </p>

        <div className="space-y-2 p-2.5 rounded-md bg-secondary/30 border border-border/50 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">What will be copied:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-foreground/80">
            <li>Dashboard layout grid and widget positions</li>
            <li>All widget instances and their configurations</li>
          </ul>

          <p className="font-medium text-foreground pt-1">What will NOT be copied:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            <li>Personal notes and collections</li>
            <li>Saved bookmarks and groups</li>
            <li>Todos, daily goals, and focus sessions</li>
          </ul>
        </div>

        {error && (
          <p className="text-destructive text-[11px] bg-destructive/10 p-2 rounded border border-destructive/20 font-medium">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};
