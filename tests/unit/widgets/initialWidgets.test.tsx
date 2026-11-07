import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ClockWidgetComponent } from '@/widgets/ClockWidget';
import { GreetingWidgetComponent } from '@/widgets/GreetingWidget';
import { CalendarOverviewWidgetComponent } from '@/widgets/CalendarOverviewWidget';
import { QuickLinksWidgetComponent } from '@/widgets/QuickLinksWidget';
import { SimpleTodoWidgetComponent } from '@/widgets/SimpleTodoWidget';
import { QuickNotesWidgetComponent } from '@/widgets/QuickNotesWidget';

describe('Initial Foundation Widgets', () => {
  it('renders ClockWidgetComponent with local time and date label', () => {
    render(
      <ClockWidgetComponent
        instanceId="inst-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={{ showSeconds: true }}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText(/Time & Date/i)).toBeInTheDocument();
  });

  it('renders GreetingWidgetComponent with customized display name', () => {
    render(
      <GreetingWidgetComponent
        instanceId="inst-2"
        workspaceId="ws-1"
        isEditMode={false}
        config={{ customName: 'Developer' }}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('renders CalendarOverviewWidgetComponent with day labels', async () => {
    render(
      <CalendarOverviewWidgetComponent
        instanceId="inst-3"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText('Study Calendar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Mo')).toBeInTheDocument();
    });
  });

  it('renders QuickLinksWidgetComponent and adds a new shortcut', () => {
    const handleUpdate = vi.fn();
    render(
      <QuickLinksWidgetComponent
        instanceId="inst-4"
        workspaceId="ws-1"
        isEditMode={false}
        config={{ links: [{ id: '1', title: 'GitHub', url: 'https://github.com' }] }}
        onUpdateConfig={handleUpdate}
        onRemove={() => {}}
      />
    );

    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('renders SimpleTodoWidgetComponent and checks a task', () => {
    const handleUpdate = vi.fn();
    render(
      <SimpleTodoWidgetComponent
        instanceId="inst-5"
        workspaceId="ws-1"
        isEditMode={false}
        config={{
          tasks: [{ id: 'task-1', title: 'Plan Study Session', completed: false }],
        }}
        onUpdateConfig={handleUpdate}
        onRemove={() => {}}
      />
    );

    expect(screen.getByText('Plan Study Session')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleUpdate).toHaveBeenCalledWith({
      tasks: [{ id: 'task-1', title: 'Plan Study Session', completed: true }],
    });
  });

  it('renders QuickNotesWidgetComponent and triggers config update on edit', () => {
    const handleUpdate = vi.fn();
    render(
      <QuickNotesWidgetComponent
        instanceId="inst-6"
        workspaceId="ws-1"
        isEditMode={false}
        config={{ content: 'Initial Note' }}
        onUpdateConfig={handleUpdate}
        onRemove={() => {}}
      />
    );

    const textarea = screen.getByDisplayValue('Initial Note');
    fireEvent.change(textarea, { target: { value: 'Updated Note' } });
    expect(handleUpdate).toHaveBeenCalledWith({ content: 'Updated Note' });
  });
});
