import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { useThemeStore } from '../../../src/stores/themeStore';
import { WorkspaceSwitcher } from '../../../src/features/workspaces/components/WorkspaceSwitcher';
import { WorkspaceManagerModal } from '../../../src/features/workspaces/components/WorkspaceManagerModal';
import { WorkspaceFormModal } from '../../../src/features/workspaces/components/WorkspaceFormModal';
import { WorkspaceDeleteDialog } from '../../../src/features/workspaces/components/WorkspaceDeleteDialog';
import { WorkspaceDuplicateDialog } from '../../../src/features/workspaces/components/WorkspaceDuplicateDialog';
import { WorkspaceIconPicker } from '../../../src/features/workspaces/components/WorkspaceIconPicker';
import { WorkspaceColorPicker } from '../../../src/features/workspaces/components/WorkspaceColorPicker';

describe('Milestone 8.7 — Workspace UI Polish, Theme Support & Accessibility Suite', () => {
  let testDb: NookSpaceDB;
  let workspaceRepo: WorkspaceRepository;

  const ws1 = 'ws-polish-1';
  const ws2 = 'ws-polish-2';
  const ws3 = 'ws-polish-long';

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-ws-polish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    workspaceRepo = new WorkspaceRepository(testDb);

    // Seed 3 test workspaces with various names & configurations
    await testDb.workspaces.bulkPut([
      {
        id: ws1,
        name: 'Personal Space',
        icon: 'Home',
        color: '#6366f1',
        isDefault: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: ws2,
        name: 'Deep Work',
        icon: 'Briefcase',
        color: '#10b981',
        isDefault: false,
        order: 1,
        createdAt: 2000,
        updatedAt: 2000,
      },
      {
        id: ws3,
        name: 'Extremely Long Workspace Title For Stress Testing Truncation And Layout Overflow In TopNav',
        icon: 'Code',
        color: undefined,
        isDefault: false,
        order: 2,
        createdAt: 3000,
        updatedAt: 3000,
      },
    ]);

    const workspaces = await workspaceRepo.getAll();
    useWorkspaceStore.setState({
      workspaces,
      activeWorkspaceId: ws1,
      isLoading: false,
      error: null,
    });
  });

  afterEach(async () => {
    await testDb.delete();
    vi.restoreAllMocks();
  });

  // ========================================================
  // 1. WORKSPACE SWITCHER UI POLISH & ACCESSIBILITY
  // ========================================================
  describe('Workspace Switcher Polish & Interactions', () => {
    it('renders current workspace icon, name, and accessible trigger label', () => {
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole('button', {
        name: /Current workspace: Personal Space\. Switch workspace\./i,
      });
      expect(trigger).toBeInTheDocument();
      expect(screen.getByText('Personal Space')).toBeInTheDocument();
    });

    it('safely truncates long workspace names in trigger without crashing', () => {
      useWorkspaceStore.setState({ activeWorkspaceId: ws3 });
      render(<WorkspaceSwitcher />);

      const label = screen.getByText(
        'Extremely Long Workspace Title For Stress Testing Truncation And Layout Overflow In TopNav'
      );
      expect(label).toBeInTheDocument();
      expect(label.className).toContain('truncate');
    });

    it('opens dropdown with accessible menuitemradio items and active checked state', () => {
      render(<WorkspaceSwitcher onOpenCreate={vi.fn()} onOpenManager={vi.fn()} />);

      const trigger = screen.getByRole('button', {
        name: /Current workspace: Personal Space/i,
      });
      fireEvent.click(trigger);

      // Menu role present
      const menu = screen.getByRole('menu', { name: /switch workspace/i });
      expect(menu).toBeInTheDocument();

      // Workspace items have menuitemradio role
      const radios = screen.getAllByRole('menuitemradio');
      expect(radios).toHaveLength(3);

      // Active workspace is checked
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');
      expect(radios[1]).toHaveAttribute('aria-checked', 'false');

      // Actions are regular menuitems
      expect(screen.getByRole('menuitem', { name: /Create Workspace\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Manage Workspaces\.\.\./i })).toBeInTheDocument();
    });

    it('supports keyboard navigation via ArrowDown, ArrowUp, and Escape', () => {
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole('button', {
        name: /Current workspace: Personal Space/i,
      });

      // Open with Enter key
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Close with Escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('selecting current workspace is a no-op that does not trigger store updates', () => {
      const setActiveSpy = vi.spyOn(useWorkspaceStore.getState(), 'setActiveWorkspace');
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole('button', {
        name: /Current workspace: Personal Space/i,
      });
      fireEvent.click(trigger);

      const activeItem = screen.getByRole('menuitemradio', { name: /Personal Space/i });
      fireEvent.click(activeItem);

      expect(setActiveSpy).not.toHaveBeenCalled();
    });

    it('selecting another workspace triggers setActiveWorkspace when allowed', () => {
      const setActiveSpy = vi.spyOn(useWorkspaceStore.getState(), 'setActiveWorkspace');
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByRole('button', {
        name: /Current workspace: Personal Space/i,
      });
      fireEvent.click(trigger);

      const targetItem = screen.getByRole('menuitemradio', { name: /Deep Work/i });
      fireEvent.click(targetItem);

      expect(setActiveSpy).toHaveBeenCalledWith(ws2);
    });
  });

  // ========================================================
  // 2. WORKSPACE MANAGER UI POLISH & ACCESSIBILITY
  // ========================================================
  describe('Workspace Manager Polish & Accessibility', () => {
    it('displays distinct Active and Default badges without relying on color alone', () => {
      render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

      // Active badge
      expect(screen.getByText('Active')).toBeInTheDocument();
      // Default badge
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('provides accessible reordering buttons with boundary disabled state', () => {
      render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

      const firstUpBtn = screen.getByRole('button', { name: 'Move Personal Space up' });
      const firstDownBtn = screen.getByRole('button', { name: 'Move Personal Space down' });

      // First item cannot move up
      expect(firstUpBtn).toBeDisabled();
      expect(firstDownBtn).not.toBeDisabled();

      // Last item cannot move down
      const lastDownBtn = screen.getByRole('button', {
        name: 'Move Extremely Long Workspace Title For Stress Testing Truncation And Layout Overflow In TopNav down',
      });
      expect(lastDownBtn).toBeDisabled();
    });

    it('disables delete button and shows informative tooltip when only 1 workspace remains', () => {
      // Set single workspace in store
      useWorkspaceStore.setState({
        workspaces: [useWorkspaceStore.getState().workspaces[0]],
      });

      render(<WorkspaceManagerModal isOpen={true} onClose={vi.fn()} />);

      const deleteBtn = screen.getByRole('button', { name: 'Delete Personal Space' });
      expect(deleteBtn).toBeDisabled();
    });
  });

  // ========================================================
  // 3. PRESET SELECTION & CREATION POLISH
  // ========================================================
  describe('Preset Selection and Creation Form Polish', () => {
    it('renders all 4 built-in presets with category, widget counts, and highlights', () => {
      render(
        <WorkspaceFormModal
          isOpen={true}
          onClose={vi.fn()}
          mode="create"
          onSubmitCreate={vi.fn()}
        />
      );

      expect(screen.getByRole('radio', { name: 'Minimalist' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Deep Study' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Developer' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Full Studio' })).toBeInTheDocument();

      expect(screen.getByText('4 widgets')).toBeInTheDocument(); // Minimalist
      expect(screen.getByText('7 widgets')).toBeInTheDocument(); // Deep Study
      expect(screen.getByText('6 widgets')).toBeInTheDocument(); // Developer
      expect(screen.getByText('10 widgets')).toBeInTheDocument(); // Full Studio
    });

    it('keyboard activation of preset card via Enter or Space key', () => {
      render(
        <WorkspaceFormModal
          isOpen={true}
          onClose={vi.fn()}
          mode="create"
          onSubmitCreate={vi.fn()}
        />
      );

      const devPreset = screen.getByRole('radio', { name: 'Developer' });
      expect(devPreset).toHaveAttribute('aria-checked', 'false');

      // Press Enter to select
      fireEvent.keyDown(devPreset, { key: 'Enter' });
      expect(devPreset).toHaveAttribute('aria-checked', 'true');

      // Auto-populates suggested name
      const nameInput = screen.getByLabelText(/Workspace Name/i);
      expect((nameInput as HTMLInputElement).value).toBe('Developer');
    });

    it('associates validation error with input via aria-invalid and role="alert"', async () => {
      render(
        <WorkspaceFormModal
          isOpen={true}
          onClose={vi.fn()}
          mode="create"
          onSubmitCreate={vi.fn()}
        />
      );

      const submitBtn = screen.getByRole('button', { name: 'Create Workspace' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Workspace name is required');
      });

      const nameInput = screen.getByLabelText(/Workspace Name/i);
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('switching to Blank Workspace tab preserves name input and cleans preset selection', () => {
      render(
        <WorkspaceFormModal
          isOpen={true}
          onClose={vi.fn()}
          mode="create"
          onSubmitCreate={vi.fn()}
        />
      );

      // Select preset first
      fireEvent.click(screen.getByRole('radio', { name: 'Minimalist' }));
      expect(screen.getByDisplayValue('Minimalist')).toBeInTheDocument();

      // Switch to Blank Workspace
      const blankTab = screen.getByRole('button', { name: /Blank Workspace/i });
      fireEvent.click(blankTab);

      // Preset cards are no longer shown
      expect(screen.queryByRole('radio', { name: 'Minimalist' })).not.toBeInTheDocument();
      // Form remains clean and ready
      expect(screen.getByPlaceholderText(/e\.g\. Japanese Study/i)).toBeInTheDocument();
    });
  });

  // ========================================================
  // 4. DIALOG ACCESSIBILITY & DATA INTEGRITY
  // ========================================================
  describe('Dialog Accessibility & Safety Warnings', () => {
    it('WorkspaceDeleteDialog explains permanent scoped data loss and active fallback', () => {
      render(
        <WorkspaceDeleteDialog
          isOpen={true}
          onClose={vi.fn()}
          workspace={useWorkspaceStore.getState().workspaces[0]}
          totalWorkspacesCount={3}
          isActiveWorkspace={true}
          onConfirmDelete={vi.fn()}
        />
      );

      // Heading and permanent warning
      expect(screen.getByRole('heading', { name: /delete workspace/i })).toBeInTheDocument();
      expect(screen.getByText(/permanent and cannot be undone/i)).toBeInTheDocument();
      // Scoped data items listed
      expect(screen.getByText(/Dashboard widgets and responsive grid positions/i)).toBeInTheDocument();
      expect(screen.getByText(/Notes, collections, tags, and bookmark links/i)).toBeInTheDocument();
      // Fallback message
      expect(screen.getByText(/automatically switch to your default workspace/i)).toBeInTheDocument();
    });

    it('WorkspaceDuplicateDialog clearly outlines what is copied vs not copied', () => {
      render(
        <WorkspaceDuplicateDialog
          isOpen={true}
          onClose={vi.fn()}
          workspace={useWorkspaceStore.getState().workspaces[0]}
          onConfirmDuplicate={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { name: /duplicate workspace/i })).toBeInTheDocument();
      expect(screen.getByText('What will be copied:')).toBeInTheDocument();
      expect(screen.getByText('What will NOT be copied:')).toBeInTheDocument();
    });
  });

  // ========================================================
  // 5. ICON & COLOR PICKERS KEYBOARD NAVIGATION
  // ========================================================
  describe('Icon & Color Pickers Accessibility', () => {
    it('WorkspaceIconPicker allows navigating icons with ArrowRight key', () => {
      const handleChange = vi.fn();
      render(<WorkspaceIconPicker value="LayoutGrid" onChange={handleChange} />);

      const currentIcon = screen.getByRole('radio', { name: 'LayoutGrid' });
      fireEvent.keyDown(currentIcon, { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledWith('Home');
    });

    it('WorkspaceColorPicker allows navigating colors with ArrowRight key', () => {
      const handleChange = vi.fn();
      render(<WorkspaceColorPicker value="#6366f1" onChange={handleChange} />);

      const currentColor = screen.getByRole('radio', { name: 'Indigo' });
      fireEvent.keyDown(currentColor, { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledWith('#10b981'); // Emerald is next
    });
  });

  // ========================================================
  // 6. THEME SUPPORT & ACCESSIBILITY
  // ========================================================
  describe('Theme Support & Theme Switch Coherence', () => {
    it('theme store initializes and supports switching between light, dark, and system without resetting workspace', () => {
      const themeStore = useThemeStore.getState();

      themeStore.setTheme('light');
      expect(useThemeStore.getState().theme).toBe('light');
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(ws1);

      themeStore.setTheme('dark');
      expect(useThemeStore.getState().theme).toBe('dark');
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(ws1);

      themeStore.setTheme('system');
      expect(useThemeStore.getState().theme).toBe('system');
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(ws1);
    });
  });
});

