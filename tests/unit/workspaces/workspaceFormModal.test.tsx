import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceFormModal } from '../../../src/features/workspaces/components/WorkspaceFormModal';
import { WorkspaceEntity } from '../../../src/types/workspaces';

const mockWorkspace: WorkspaceEntity = {
  id: 'ws-edit-1',
  name: 'Existing Workspace',
  icon: 'BookOpen',
  color: '#10b981',
  order: 1,
  isDefault: false,
  createdAt: 1000,
  updatedAt: 1000,
};

describe('WorkspaceFormModal Suite — Milestone 8.2', () => {
  it('1. validates workspace name is required in Create mode', async () => {
    const onSubmitCreate = vi.fn();
    render(
      <WorkspaceFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="create"
        onSubmitCreate={onSubmitCreate}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Create Workspace/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Workspace name is required/i)).toBeInTheDocument();
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('2. validates workspace name max length 50 chars', async () => {
    render(
      <WorkspaceFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="create"
        onSubmitCreate={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/e.g. Japanese Study/i);
    fireEvent.change(input, { target: { value: 'A'.repeat(51) } });

    const submitBtn = screen.getByRole('button', { name: /Create Workspace/i });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText(/Workspace name must be 50 characters or less/i)
    ).toBeInTheDocument();
  });

  it('3. submits trimmed name, selected icon, and selected color in Create mode', async () => {
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <WorkspaceFormModal
        isOpen={true}
        onClose={onClose}
        mode="create"
        onSubmitCreate={onSubmitCreate}
      />
    );

    const input = screen.getByPlaceholderText(/e.g. Japanese Study/i);
    fireEvent.change(input, { target: { value: '   New Workspace Alpha   ' } });

    // Select Terminal icon
    const terminalIconBtn = screen.getByRole('radio', { name: 'Terminal' });
    fireEvent.click(terminalIconBtn);

    // Select Violet color
    const violetColorBtn = screen.getByRole('radio', { name: 'Violet' });
    fireEvent.click(violetColorBtn);

    const submitBtn = screen.getByRole('button', { name: /Create Workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith({
        name: 'New Workspace Alpha',
        icon: 'Terminal',
        color: '#8b5cf6',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('4. pre-fills initial values in Edit mode and submits changes', async () => {
    const onSubmitEdit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <WorkspaceFormModal
        isOpen={true}
        onClose={onClose}
        mode="edit"
        initialWorkspace={mockWorkspace}
        onSubmitEdit={onSubmitEdit}
      />
    );

    const input = screen.getByDisplayValue('Existing Workspace');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Renamed Workspace' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith('ws-edit-1', {
        name: 'Renamed Workspace',
        icon: 'BookOpen',
        color: '#10b981',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('5. invokes onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <WorkspaceFormModal
        isOpen={true}
        onClose={onClose}
        mode="create"
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('6. selecting a preset auto-populates name, icon, and color, and submits presetId', async () => {
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <WorkspaceFormModal
        isOpen={true}
        onClose={onClose}
        mode="create"
        onSubmitCreate={onSubmitCreate}
      />
    );

    // Select Deep Study preset
    const deepStudyCard = screen.getByRole('radio', { name: 'Deep Study' });
    fireEvent.click(deepStudyCard);

    // Verify name was auto-populated with preset name
    const input = screen.getByDisplayValue('Deep Study');
    expect(input).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Create Workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith({
        name: 'Deep Study',
        icon: 'GraduationCap',
        color: '#10b981',
        presetId: 'deep-study',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('7. allows overriding the pre-filled preset name before submitting', async () => {
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="create"
        onSubmitCreate={onSubmitCreate}
      />
    );

    // Select Minimalist preset
    const minimalistCard = screen.getByRole('radio', { name: 'Minimalist' });
    fireEvent.click(minimalistCard);

    const input = screen.getByDisplayValue('Minimalist');
    fireEvent.change(input, { target: { value: 'Zen Meditation Zone' } });

    const submitBtn = screen.getByRole('button', { name: /Create Workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith({
        name: 'Zen Meditation Zone',
        icon: 'Home',
        color: undefined,
        presetId: 'minimalist',
      });
    });
  });

  it('8. switching to Blank Workspace tab clears preset selection', async () => {
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="create"
        onSubmitCreate={onSubmitCreate}
      />
    );

    // Select Deep Study first
    fireEvent.click(screen.getByRole('radio', { name: 'Deep Study' }));

    // Switch to Blank Workspace
    const blankTab = screen.getByRole('button', { name: /Blank Workspace/i });
    fireEvent.click(blankTab);

    // Form inputs should reset
    const input = screen.getByPlaceholderText(/e.g. Japanese Study/i);
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'Pure Blank Space' } });

    const submitBtn = screen.getByRole('button', { name: /Create Workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith({
        name: 'Pure Blank Space',
        icon: 'LayoutGrid',
        color: undefined,
      });
    });
  });
});
