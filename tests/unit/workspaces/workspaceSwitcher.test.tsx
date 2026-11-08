import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceSwitcher } from '../../../src/features/workspaces/components/WorkspaceSwitcher';
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
    name: 'Research Lab',
    icon: 'Lightbulb',
    color: '#10b981',
    order: 1,
    isDefault: false,
    createdAt: 2000,
    updatedAt: 2000,
  },
];

describe('WorkspaceSwitcher Suite — Milestone 8.2', () => {
  const setActiveSpy = vi.fn().mockResolvedValue(undefined);
  const requestSwitchSpy = vi.fn(() => 'ALLOW' as const);

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      workspaces: [...mockWorkspaces],
      activeWorkspaceId: 'ws-1',
      setActiveWorkspace: setActiveSpy,
    });
    useCustomizationStore.setState({
      requestWorkspaceSwitch: requestSwitchSpy,
    });
  });

  it('1. renders active workspace button with correct name and aria-label', () => {
    render(<WorkspaceSwitcher />);

    const trigger = screen.getByRole('button', {
      name: /Current workspace: Personal Space\. Switch workspace\./i,
    });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('Personal Space')).toBeInTheDocument();
  });

  it('2. opens dropdown on click and displays workspace items and management actions', () => {
    const onOpenCreate = vi.fn();
    const onOpenManager = vi.fn();

    render(
      <WorkspaceSwitcher
        onOpenCreate={onOpenCreate}
        onOpenManager={onOpenManager}
      />
    );

    const trigger = screen.getByRole('button', {
      name: /Current workspace: Personal Space\. Switch workspace\./i,
    });
    fireEvent.click(trigger);

    // Both workspaces in dropdown
    expect(screen.getByText('Research Lab')).toBeInTheDocument();
    expect(screen.getByText('Create Workspace...')).toBeInTheDocument();
    expect(screen.getByText('Manage Workspaces...')).toBeInTheDocument();

    // Click Create Workspace
    fireEvent.click(screen.getByText('Create Workspace...'));
    expect(onOpenCreate).toHaveBeenCalledTimes(1);

    // Reopen and click Manage Workspaces
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('Manage Workspaces...'));
    expect(onOpenManager).toHaveBeenCalledTimes(1);
  });

  it('3. selects another workspace when clicked in dropdown', () => {
    render(<WorkspaceSwitcher />);

    const trigger = screen.getByRole('button', {
      name: /Current workspace: Personal Space\. Switch workspace\./i,
    });
    fireEvent.click(trigger);

    const researchItem = screen.getByText('Research Lab');
    fireEvent.click(researchItem);

    expect(requestSwitchSpy).toHaveBeenCalledWith('ws-2');
    expect(setActiveSpy).toHaveBeenCalledWith('ws-2');
  });

  it('4. does not call setActiveWorkspace when clicking the currently active workspace', () => {
    render(<WorkspaceSwitcher />);

    const trigger = screen.getByRole('button', {
      name: /Current workspace: Personal Space\. Switch workspace\./i,
    });
    fireEvent.click(trigger);

    // In dropdown, find Personal Space
    const dropdownItems = screen.getAllByText('Personal Space');
    // Click the one inside the dropdown list
    fireEvent.click(dropdownItems[dropdownItems.length - 1]);

    expect(setActiveSpy).not.toHaveBeenCalled();
  });

  it('5. does not call setActiveWorkspace if customizationStore returns CONFIRM_REQUIRED', () => {
    useCustomizationStore.setState({
      requestWorkspaceSwitch: vi.fn(() => 'CONFIRM_REQUIRED' as const),
    });

    render(<WorkspaceSwitcher />);

    const trigger = screen.getByRole('button', {
      name: /Current workspace: Personal Space\. Switch workspace\./i,
    });
    fireEvent.click(trigger);

    const researchItem = screen.getByText('Research Lab');
    fireEvent.click(researchItem);

    expect(setActiveSpy).not.toHaveBeenCalled();
  });
});
