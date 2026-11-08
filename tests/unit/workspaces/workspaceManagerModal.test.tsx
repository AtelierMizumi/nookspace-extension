import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceManagerModal } from '../../../src/features/workspaces/components/WorkspaceManagerModal';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { WorkspaceEntity } from '../../../src/types/workspaces';

const mockWorkspaces: WorkspaceEntity[] = [
  {
    id: 'ws-1',
    name: 'Personal Space',
    icon: 'Home',
    color: '#6366f1',
    order: 0,
    isDefault: true,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'ws-2',
    name: 'Study Space',
    icon: 'GraduationCap',
    color: '#10b981',
    order: 1,
    isDefault: false,
    createdAt: 2000,
    updatedAt: 2000,
  },
  {
    id: 'ws-3',
    name: 'Work Space',
    icon: 'Briefcase',
    color: '#f59e0b',
    order: 2,
    isDefault: false,
    createdAt: 3000,
    updatedAt: 3000,
  },
];

describe('WorkspaceManagerModal Suite — Milestone 8.2', () => {
  const reorderSpy = vi.fn().mockResolvedValue(undefined);
  const setActiveSpy = vi.fn().mockResolvedValue(undefined);
  const updateSpy = vi.fn().mockResolvedValue(undefined);
  const duplicateSpy = vi.fn().mockResolvedValue(undefined);
  const deleteSpy = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      workspaces: [...mockWorkspaces],
      activeWorkspaceId: 'ws-1',
      isLoading: false,
      reorderWorkspaces: reorderSpy,
      setActiveWorkspace: setActiveSpy,
      updateWorkspace: updateSpy,
      duplicateWorkspace: duplicateSpy,
      deleteWorkspace: deleteSpy,
    });
    useCustomizationStore.setState({
      requestWorkspaceSwitch: vi.fn(() => 'ALLOW' as const),
    });
  });

  it('1. renders all workspaces with active and default indicators', () => {
    render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Personal Space')).toBeInTheDocument();
    expect(screen.getByText('Study Space')).toBeInTheDocument();
    expect(screen.getByText('Work Space')).toBeInTheDocument();

    // Active badge for ws-1
    expect(screen.getByText('Active')).toBeInTheDocument();
    // Default badge for ws-1
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('2. enforces boundary conditions for reorder up/down buttons and triggers reorder', async () => {
    render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

    // First item: Move up should be disabled
    const firstUpBtn = screen.getByRole('button', { name: 'Move Personal Space up' });
    expect(firstUpBtn).toBeDisabled();

    // Last item: Move down should be disabled
    const lastDownBtn = screen.getByRole('button', { name: 'Move Work Space down' });
    expect(lastDownBtn).toBeDisabled();

    // Move Study Space (index 1) up -> swaps with Personal Space
    const studyUpBtn = screen.getByRole('button', { name: 'Move Study Space up' });
    expect(studyUpBtn).not.toBeDisabled();
    fireEvent.click(studyUpBtn);

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledWith(['ws-2', 'ws-1', 'ws-3']);
    });
  });

  it('3. switches active workspace when clicking a non-active workspace name or Switch button', () => {
    render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

    const studyNameBtn = screen.getByText('Study Space');
    fireEvent.click(studyNameBtn);

    expect(setActiveSpy).toHaveBeenCalledWith('ws-2');
  });

  it('4. opens Edit modal on clicking edit icon and saves changes', async () => {
    render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

    const editBtn = screen.getByRole('button', { name: 'Edit Study Space' });
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Workspace')).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue('Study Space');
    fireEvent.change(nameInput, { target: { value: 'Advanced Study' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('ws-2', {
        name: 'Advanced Study',
        icon: 'GraduationCap',
        color: '#10b981',
      });
    });
  });

  it('5. opens Duplicate dialog and duplicates workspace', async () => {
    render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

    const duplicateBtn = screen.getByRole('button', { name: 'Duplicate Study Space' });
    fireEvent.click(duplicateBtn);

    expect(screen.getByText(/Create an independent copy of/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Duplicate Workspace' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(duplicateSpy).toHaveBeenCalledWith('ws-2');
    });
  });

  it('6. opens Delete dialog and confirms deletion', async () => {
    render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

    const deleteBtn = screen.getByRole('button', { name: 'Delete Study Space' });
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete Workspace' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('ws-2');
    });
  });

  it('7. disables delete button when only one workspace exists', () => {
    useWorkspaceStore.setState({
      workspaces: [mockWorkspaces[0]],
      activeWorkspaceId: 'ws-1',
    });

    render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

    const deleteBtn = screen.getByRole('button', { name: 'Delete Personal Space' });
    expect(deleteBtn).toBeDisabled();
  });

  it('8. invokes onOpenCreate when New Workspace button is clicked', () => {
    const onOpenCreate = vi.fn();
    render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} onOpenCreate={onOpenCreate} />);

    const newBtn = screen.getByRole('button', { name: /New Workspace/i });
    fireEvent.click(newBtn);

    expect(onOpenCreate).toHaveBeenCalledTimes(1);
  });
});
