import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomizationToolbar } from '../../../src/features/layout-editor/CustomizationToolbar';
import { useCustomizationStore } from '../../../src/stores/customizationStore';

describe('Milestone 3.2 — Customization Studio Toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCustomizationStore.setState({
      isEditMode: false,
      activeWorkspaceId: 'ws-1',
      currentBreakpoint: 'lg',
      currentLayouts: [],
      editingLayoutsByBreakpoint: { lg: [], md: [], sm: [], xs: [], xxs: [] },
      originalLayoutsSnapshot: null,
      snapshotWorkspaceId: null,
      stagedDeletedWidgetIds: [],
      stagedAddedWidgetIds: [],
      hasUnsavedChanges: false,
      isSaving: false,
      saveError: null,
      isUnsavedPromptOpen: false,
      pendingWorkspaceSwitchId: null,
    });
  });

  it('1. renders View Mode with Customize button and hides editing action buttons', () => {
    render(<CustomizationToolbar isEditMode={false} />);

    expect(screen.getByRole('button', { name: /customize/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add widget/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset layout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^done$/i })).not.toBeInTheDocument();
  });

  it('2. clicking Customize invokes onEnterEditMode callback', () => {
    const onEnterEditMode = vi.fn();
    render(<CustomizationToolbar isEditMode={false} onEnterEditMode={onEnterEditMode} />);

    const customizeBtn = screen.getByRole('button', { name: /customize/i });
    fireEvent.click(customizeBtn);

    expect(onEnterEditMode).toHaveBeenCalledTimes(1);
  });

  it('3. renders Edit Mode with status badge and all 4 action controls', () => {
    render(<CustomizationToolbar isEditMode={true} hasUnsavedChanges={false} />);

    expect(screen.getByText(/editing dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/no changes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add widget/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset layout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument();
  });

  it('4. displays "Changes are not saved yet" warning badge when hasUnsavedChanges is true', () => {
    render(<CustomizationToolbar isEditMode={true} hasUnsavedChanges={true} />);

    expect(screen.getByText(/changes are not saved yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/no changes/i)).not.toBeInTheDocument();
  });

  it('5. clicking Add Widget triggers onAddWidget callback', () => {
    const onAddWidget = vi.fn();
    render(<CustomizationToolbar isEditMode={true} onAddWidget={onAddWidget} />);

    fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
    expect(onAddWidget).toHaveBeenCalledTimes(1);
  });

  it('6. Reset Layout opens confirmation modal and only executes on user confirmation', () => {
    const onResetLayout = vi.fn();
    render(<CustomizationToolbar isEditMode={true} onResetLayout={onResetLayout} />);

    // Click Reset Layout button
    fireEvent.click(screen.getByRole('button', { name: /reset layout/i }));

    // Confirmation dialog appears
    expect(screen.getByText(/reset layout to default\?/i)).toBeInTheDocument();
    expect(screen.getByText(/zero data loss/i)).toBeInTheDocument();
    expect(onResetLayout).not.toHaveBeenCalled();

    // Confirm reset
    const allResetButtons = screen.getAllByRole('button', { name: /reset layout/i });
    const confirmBtn = allResetButtons[allResetButtons.length - 1];
    fireEvent.click(confirmBtn);

    expect(onResetLayout).toHaveBeenCalledTimes(1);
  });

  it('7. Cancel without unsaved changes exits immediately without confirmation modal', () => {
    const onCancel = vi.fn();
    render(<CustomizationToolbar isEditMode={true} hasUnsavedChanges={false} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/discard changes\?/i)).not.toBeInTheDocument();
  });

  it('8. Cancel with unsaved changes shows confirmation modal and only rolls back on confirmation', () => {
    const onCancel = vi.fn();
    render(<CustomizationToolbar isEditMode={true} hasUnsavedChanges={true} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Confirmation dialog appears
    expect(screen.getByText(/discard changes\?/i)).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    // Clicking "Keep Editing" cancels the prompt
    fireEvent.click(screen.getByRole('button', { name: /keep editing/i }));
    expect(screen.queryByText(/discard changes\?/i)).not.toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    // Clicking Cancel again and confirming Discard
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    fireEvent.click(screen.getByRole('button', { name: /discard changes/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('9. pressing Escape triggers cancel flow', () => {
    const onCancel = vi.fn();
    render(<CustomizationToolbar isEditMode={true} hasUnsavedChanges={false} onCancel={onCancel} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('10. clicking Done invokes onDone callback', () => {
    const onDone = vi.fn();
    render(<CustomizationToolbar isEditMode={true} onDone={onDone} />);

    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('11. displays loading state and disables actions during isSaving', () => {
    const onDone = vi.fn();
    render(<CustomizationToolbar isEditMode={true} isSaving={true} onDone={onDone} />);

    expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();

    const doneBtn = screen.getByRole('button', { name: /saving\.\.\./i });
    expect(doneBtn).toBeDisabled();

    // Other actions disabled to prevent concurrent mutation
    expect(screen.getByRole('button', { name: /add widget/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reset layout/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    // Clicking does not trigger concurrent onDone
    fireEvent.click(doneBtn);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('12. displays error banner when saveError occurs and keeps Edit Mode open', () => {
    render(
      <CustomizationToolbar
        isEditMode={true}
        saveError="Disk quota exceeded. Unable to save layout."
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/disk quota exceeded/i);
    // Actions are still accessible so the user can retry Done or Cancel
    expect(screen.getByRole('button', { name: /^done$/i })).not.toBeDisabled();
  });

  it('13. renders workspace switch safety modal when isUnsavedPromptOpen is true in store', () => {
    useCustomizationStore.setState({
      isEditMode: true,
      hasUnsavedChanges: true,
      isUnsavedPromptOpen: true,
      pendingWorkspaceSwitchId: 'ws-work',
    });

    render(<CustomizationToolbar isEditMode={true} hasUnsavedChanges={true} />);

    expect(screen.getByText(/unsaved changes in workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard & switch/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep editing/i })).toBeInTheDocument();
  });
});
