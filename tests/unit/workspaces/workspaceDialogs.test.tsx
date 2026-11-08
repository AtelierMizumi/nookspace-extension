import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceDeleteDialog } from '../../../src/features/workspaces/components/WorkspaceDeleteDialog';
import { WorkspaceDuplicateDialog } from '../../../src/features/workspaces/components/WorkspaceDuplicateDialog';
import { WorkspaceEntity } from '../../../src/types/workspaces';

const mockWorkspace: WorkspaceEntity = {
  id: 'ws-test-1',
  name: 'Project Orion',
  icon: 'Rocket',
  color: '#ec4899',
  order: 0,
  isDefault: false,
  createdAt: 1000,
  updatedAt: 1000,
};

describe('WorkspaceDialogs Suite — Milestone 8.2', () => {
  describe('WorkspaceDeleteDialog', () => {
    it('1. does not render when closed or workspace is null', () => {
      const { rerender } = render(
        <WorkspaceDeleteDialog
          isOpen={false}
          onClose={vi.fn()}
          workspace={mockWorkspace}
          totalWorkspacesCount={2}
          isActiveWorkspace={false}
          onConfirmDelete={vi.fn()}
        />
      );
      expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();

      rerender(
        <WorkspaceDeleteDialog
          isOpen={true}
          onClose={vi.fn()}
          workspace={null}
          totalWorkspacesCount={2}
          isActiveWorkspace={false}
          onConfirmDelete={vi.fn()}
        />
      );
      expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();
    });

    it('2. blocks deletion when it is the sole workspace', () => {
      render(
        <WorkspaceDeleteDialog
          isOpen={true}
          onClose={vi.fn()}
          workspace={mockWorkspace}
          totalWorkspacesCount={1}
          isActiveWorkspace={true}
          onConfirmDelete={vi.fn()}
        />
      );

      expect(
        screen.getByText(/Cannot delete the only remaining workspace/i)
      ).toBeInTheDocument();

      const deleteBtn = screen.getByRole('button', { name: /Delete Workspace/i });
      expect(deleteBtn).toBeDisabled();
    });

    it('3. shows cascade warning and calls onConfirmDelete when confirmed', async () => {
      const onConfirmDelete = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <WorkspaceDeleteDialog
          isOpen={true}
          onClose={onClose}
          workspace={mockWorkspace}
          totalWorkspacesCount={3}
          isActiveWorkspace={true}
          onConfirmDelete={onConfirmDelete}
        />
      );

      expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByText(/permanent and cannot be undone/i)).toBeInTheDocument();
      expect(screen.getByText(/atomically remove its dashboard layout/i)).toBeInTheDocument();

      const deleteBtn = screen.getByRole('button', { name: /Delete Workspace/i });
      expect(deleteBtn).not.toBeDisabled();

      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(onConfirmDelete).toHaveBeenCalledWith('ws-test-1');
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('WorkspaceDuplicateDialog', () => {
    it('4. renders explanation of dashboard duplication and calls onConfirmDuplicate', async () => {
      const onConfirmDuplicate = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <WorkspaceDuplicateDialog
          isOpen={true}
          onClose={onClose}
          workspace={mockWorkspace}
          onConfirmDuplicate={onConfirmDuplicate}
        />
      );

      expect(screen.getByText(/Create an independent copy of/i)).toBeInTheDocument();
      expect(screen.getByText(/What will NOT be copied/i)).toBeInTheDocument();
      expect(screen.getByText(/Personal notes and collections/i)).toBeInTheDocument();

      const duplicateBtn = screen.getByRole('button', { name: /Duplicate Workspace/i });
      fireEvent.click(duplicateBtn);

      await waitFor(() => {
        expect(onConfirmDuplicate).toHaveBeenCalledWith('ws-test-1');
        expect(onClose).toHaveBeenCalled();
      });
    });
  });
});
