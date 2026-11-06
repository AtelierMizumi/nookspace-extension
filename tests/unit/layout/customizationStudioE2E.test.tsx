import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '../../../src/services/database/db';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';
import { useWidgetStore } from '../../../src/stores/widgetStore';
import { useLayoutStore } from '../../../src/stores/layoutStore';
import { CustomizationToolbar } from '../../../src/features/layout-editor/CustomizationToolbar';
import { Breakpoint, WidgetInstanceEntity, WidgetLayoutEntity } from '../../../src/types/database';
// Ensure initial widgets are registered
import '../../../src/widgets';

describe('Milestone 3.7 — Customization Studio End-to-End Consolidation', () => {
  const WS_ID = 'ws-e2e-suite';

  beforeEach(async () => {
    await db.widgetInstances.clear();
    await db.widgetLayouts.clear();

    const widgetClock: WidgetInstanceEntity = {
      id: 'e2e-clock',
      workspaceId: WS_ID,
      widgetType: 'clock',
      title: 'Digital Clock',
      config: { is24Hour: true },
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    };

    await db.widgetInstances.put(widgetClock);

    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const layouts: WidgetLayoutEntity[] = [];

    for (const bp of breakpoints) {
      layouts.push({
        id: `${WS_ID}_e2e-clock_${bp}`,
        workspaceId: WS_ID,
        widgetInstanceId: 'e2e-clock',
        breakpoint: bp,
        x: 0,
        y: 0,
        w: bp === 'xxs' ? 2 : 4,
        h: 2,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      });
    }

    await db.widgetLayouts.bulkPut(layouts);

    // Initialize stores
    useWorkspaceStore.setState({
      workspaces: [{ id: WS_ID, name: 'E2E Space', icon: 'LayoutGrid', color: '#6366f1', isDefault: true, order: 0, createdAt: 1000, updatedAt: 1000 }],
      activeWorkspaceId: WS_ID,
      isLoading: false,
    });

    useWidgetStore.setState({
      instances: [widgetClock],
      isLoading: false,
    });

    useLayoutStore.setState({
      currentBreakpoint: 'lg',
      layouts: layouts.filter((l) => l.breakpoint === 'lg'),
      isLoading: false,
    });

    useCustomizationStore.setState({
      isEditMode: false,
      activeWorkspaceId: WS_ID,
      currentBreakpoint: 'lg',
      currentLayouts: [],
      editingLayoutsByBreakpoint: { lg: [], md: [], sm: [], xs: [], xxs: [] },
      originalLayoutsSnapshot: null,
      snapshotWorkspaceId: null,
      stagedDeletedWidgetIds: [],
      stagedAddedWidgetIds: [],
      stagedAddedInstances: [],
      hasUnsavedChanges: false,
      isSaving: false,
      saveError: null,
      isUnsavedPromptOpen: false,
      pendingWorkspaceSwitchId: null,
    });
  });

  it('1. verifies full lifecycle: View Mode -> Enter Edit Mode -> Staged Edits -> Cancel Discard -> View Mode', async () => {
    const { rerender } = render(<CustomizationToolbar />);

    // 1. View Mode verification
    expect(screen.getByRole('button', { name: /customize/i })).toBeInTheDocument();
    expect(screen.queryByText(/editing dashboard/i)).not.toBeInTheDocument();

    // 2. Click Customize to enter Edit Mode
    fireEvent.click(screen.getByRole('button', { name: /customize/i }));

    await waitFor(() => {
      expect(useCustomizationStore.getState().isEditMode).toBe(true);
    });

    rerender(<CustomizationToolbar />);

    // 3. Edit Mode Toolbar controls are visible
    expect(screen.getByText(/editing dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add widget/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset layout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument();

    // 4. Move widget to simulate user drag
    useCustomizationStore.getState().updateEditingLayouts([
      {
        id: `${WS_ID}_e2e-clock_lg`,
        workspaceId: WS_ID,
        widgetInstanceId: 'e2e-clock',
        breakpoint: 'lg',
        x: 6,
        y: 2,
        w: 6,
        h: 2,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ]);

    rerender(<CustomizationToolbar />);
    expect(screen.getByText(/changes are not saved yet/i)).toBeInTheDocument();

    // 5. User clicks Cancel -> Discard confirmation dialog appears
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByText(/discard changes\?/i)).toBeInTheDocument();

    // 6. User confirms Discard
    fireEvent.click(screen.getByRole('button', { name: /discard changes/i }));

    await waitFor(() => {
      expect(useCustomizationStore.getState().isEditMode).toBe(false);
    });

    rerender(<CustomizationToolbar />);

    // Returned to View Mode
    expect(screen.getByRole('button', { name: /customize/i })).toBeInTheDocument();
    expect(screen.queryByText(/editing dashboard/i)).not.toBeInTheDocument();

    // Database remains in original position x: 0
    const inDb = await db.widgetLayouts.get(`${WS_ID}_e2e-clock_lg`);
    expect(inDb?.x).toBe(0);
    expect(inDb?.w).toBe(4);
  });

  it('2. verifies full lifecycle: View Mode -> Enter Edit Mode -> Staged Move -> Done Commit -> View Mode with persisted layout', async () => {
    const { rerender } = render(<CustomizationToolbar />);

    // 1. Enter Edit Mode
    fireEvent.click(screen.getByRole('button', { name: /customize/i }));
    await waitFor(() => {
      expect(useCustomizationStore.getState().isEditMode).toBe(true);
    });
    rerender(<CustomizationToolbar />);

    // 2. Move widget (x: 4, w: 8)
    useCustomizationStore.getState().updateEditingLayouts([
      {
        id: `${WS_ID}_e2e-clock_lg`,
        workspaceId: WS_ID,
        widgetInstanceId: 'e2e-clock',
        breakpoint: 'lg',
        x: 4,
        y: 0,
        w: 8,
        h: 2,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 3000,
      },
    ]);
    rerender(<CustomizationToolbar />);

    // 3. User clicks Done
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    await waitFor(() => {
      expect(useCustomizationStore.getState().isEditMode).toBe(false);
    });
    rerender(<CustomizationToolbar />);

    // 4. Returned to View Mode and IndexedDB is updated
    expect(screen.getByRole('button', { name: /customize/i })).toBeInTheDocument();

    const inDb = await db.widgetLayouts.get(`${WS_ID}_e2e-clock_lg`);
    expect(inDb?.x).toBe(4);
    expect(inDb?.w).toBe(8);
  });

  it('3. verifies full lifecycle: Reset Layout with Confirmation -> Done Commit saves default arrangement', async () => {
    // Start with custom layout (x: 6, y: 4)
    await db.widgetLayouts.update(`${WS_ID}_e2e-clock_lg`, { x: 6, y: 4 });

    const { rerender } = render(<CustomizationToolbar />);

    // Enter Edit Mode
    fireEvent.click(screen.getByRole('button', { name: /customize/i }));
    await waitFor(() => {
      expect(useCustomizationStore.getState().isEditMode).toBe(true);
    });
    rerender(<CustomizationToolbar />);

    // Click Reset Layout
    fireEvent.click(screen.getByRole('button', { name: /reset layout/i }));
    expect(screen.getByText(/reset layout to default\?/i)).toBeInTheDocument();

    // Confirm Reset
    const allResetButtons = screen.getAllByRole('button', { name: /reset layout/i });
    fireEvent.click(allResetButtons[allResetButtons.length - 1]);

    // Check draft has reset position (0, 0)
    await waitFor(() => {
      expect(useCustomizationStore.getState().currentLayouts[0].x).toBe(0);
    });

    rerender(<CustomizationToolbar />);

    // Commit changes
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    await waitFor(() => {
      expect(useCustomizationStore.getState().isEditMode).toBe(false);
    });

    // Database is updated to (0, 0)
    const inDb = await db.widgetLayouts.get(`${WS_ID}_e2e-clock_lg`);
    expect(inDb?.x).toBe(0);
    expect(inDb?.y).toBe(0);
  });
});
