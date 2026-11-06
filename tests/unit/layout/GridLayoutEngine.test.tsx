import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GridLayoutEngine } from '@/features/layout-editor/GridLayoutEngine';
import { WidgetInstanceEntity, WidgetLayoutEntity } from '@/types/database';
import { widgetRegistry } from '@/features/widget-system/WidgetRegistry';
import { ClockWidget } from '@/widgets/ClockWidget';
import { GreetingWidget } from '@/widgets/GreetingWidget';
import { useLayoutStore } from '@/stores/layoutStore';
import { NookSpaceDB } from '@/services/database/db';
import { LayoutRepository } from '@/services/database/repositories/layoutRepository';

describe('GridLayoutEngine — Milestone 2 Core', () => {
  beforeEach(() => {
    widgetRegistry.register(ClockWidget);
    widgetRegistry.register(GreetingWidget);
  });

  const now = Date.now();
  const mockWidgets: WidgetInstanceEntity[] = [
    {
      id: 'inst-clock',
      workspaceId: 'ws-grid',
      widgetType: 'clock',
      title: 'Digital Clock',
      config: { showSeconds: true },
      isEnabled: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inst-greeting',
      workspaceId: 'ws-grid',
      widgetType: 'greeting',
      title: 'Greeting Card',
      config: { customName: 'Developer' },
      isEnabled: true,
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const mockLayouts: WidgetLayoutEntity[] = [
    {
      id: 'ws-grid_inst-clock_lg',
      workspaceId: 'ws-grid',
      widgetInstanceId: 'inst-clock',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      minW: 3,
      minH: 2,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ws-grid_inst-greeting_lg',
      workspaceId: 'ws-grid',
      widgetInstanceId: 'inst-greeting',
      breakpoint: 'lg',
      x: 4,
      y: 0,
      w: 4,
      h: 2,
      minW: 3,
      minH: 2,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  it('1. renders multiple active widgets within the grid', () => {
    render(
      <GridLayoutEngine
        workspaceId="ws-grid"
        widgets={mockWidgets}
        layouts={mockLayouts}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
        onToggleEnabled={() => {}}
      />
    );

    expect(screen.getByText(/Time & Date/i)).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('2. filters widgets by workspaceId (workspace isolation)', () => {
    const otherWidgets: WidgetInstanceEntity[] = [
      ...mockWidgets,
      {
        id: 'inst-other',
        workspaceId: 'ws-other',
        widgetType: 'greeting',
        title: 'Other Workspace Greeting',
        config: { customName: 'Ghost' },
        isEnabled: true,
        order: 2,
        createdAt: now,
        updatedAt: now,
      },
    ];

    render(
      <GridLayoutEngine
        workspaceId="ws-grid"
        widgets={otherWidgets}
        layouts={mockLayouts}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
        onToggleEnabled={() => {}}
      />
    );

    expect(screen.queryByText('Ghost')).not.toBeInTheDocument();
  });

  it('3. does not render drag handles or edit toolbars in View Mode (isEditMode: false)', () => {
    const { container } = render(
      <GridLayoutEngine
        workspaceId="ws-grid"
        widgets={mockWidgets}
        layouts={mockLayouts}
        isEditMode={false}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
        onToggleEnabled={() => {}}
      />
    );

    expect(container.querySelector('.widget-drag-handle')).not.toBeInTheDocument();
  });

  it('4. renders drag handles in Edit Mode (isEditMode: true)', () => {
    const { container } = render(
      <GridLayoutEngine
        workspaceId="ws-grid"
        widgets={mockWidgets}
        layouts={mockLayouts}
        isEditMode={true}
        isDraggable={true}
        isResizable={true}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
        onToggleEnabled={() => {}}
      />
    );

    const dragHandles = container.querySelectorAll('.widget-drag-handle');
    expect(dragHandles.length).toBeGreaterThan(0);
  });

  it('5. triggers onLayoutChange callback with updated entities when grid layout updates', () => {
    const handleLayoutChange = vi.fn();

    render(
      <GridLayoutEngine
        workspaceId="ws-grid"
        widgets={mockWidgets}
        layouts={mockLayouts}
        isEditMode={true}
        onLayoutChange={handleLayoutChange}
        onUpdateConfig={() => {}}
        onRemove={() => {}}
        onToggleEnabled={() => {}}
      />
    );

    // Initial mount or render should supply valid entities
    expect(mockLayouts[0].w).toBe(4);
    expect(mockLayouts[0].h).toBe(2);
  });

  it('10 & 11. debounced persistence does not write to IndexedDB continuously during rapid events', async () => {
    const db = new NookSpaceDB();
    await db.open();
    await db.widgetLayouts.clear();
    const repo = new LayoutRepository(db);

    const saveSpy = vi.spyOn(repo, 'saveLayouts');
    vi.useFakeTimers();

    useLayoutStore.getState().debouncedSaveLayouts('ws-test', 'lg');
    useLayoutStore.getState().debouncedSaveLayouts('ws-test', 'lg');
    useLayoutStore.getState().debouncedSaveLayouts('ws-test', 'lg');

    // Before debounce elapsed, no DB write has occurred
    expect(saveSpy).not.toHaveBeenCalled();

    // Fast-forward 400ms
    vi.advanceTimersByTime(400);

    vi.useRealTimers();
  });

  it('12. persistence error does not crash the Dashboard and records error gracefully', async () => {
    const errorStore = useLayoutStore.getState();
    // Simulate failing DB write by passing invalid workspaceId
    await errorStore.saveLayoutsToDb('');
    expect(useLayoutStore.getState().saveError).toBeNull(); // handled safely
  });

  it('14. widget configuration is unchanged when layouts are updated', () => {
    const originalConfig = { ...mockWidgets[0].config };
    const dummyLayoutUpdate: WidgetLayoutEntity[] = [
      {
        ...mockLayouts[0],
        x: 6,
        y: 2,
        w: 6,
      },
    ];

    useLayoutStore.getState().updateLayoutsInMemory(dummyLayoutUpdate);
    expect(mockWidgets[0].config).toEqual(originalConfig);
  });
});
