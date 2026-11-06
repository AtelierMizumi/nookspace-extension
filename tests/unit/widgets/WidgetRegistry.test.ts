import { describe, it, expect, beforeEach } from 'vitest';
import { WidgetRegistry } from '@/features/widget-system/WidgetRegistry';
import { WidgetDefinition } from '@/features/widget-system/types';
import { Clock } from 'lucide-react';
import React from 'react';

const dummyWidget: WidgetDefinition = {
  type: 'dummy-clock',
  name: 'Dummy Clock',
  description: 'Dummy description',
  category: 'utilities',
  icon: Clock,
  defaultConfig: {},
  defaultDimensions: { w: 4, h: 2 },
  minDimensions: { w: 2, h: 2 },
  component: () => React.createElement('div', null, 'Clock Component'),
};

describe('WidgetRegistry', () => {
  let registry: WidgetRegistry;

  beforeEach(() => {
    registry = WidgetRegistry.getInstance();
    registry.clear();
  });

  it('registers and retrieves a widget definition', () => {
    registry.register(dummyWidget);
    expect(registry.has('dummy-clock')).toBe(true);

    const retrieved = registry.get('dummy-clock');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Dummy Clock');
  });

  it('returns all registered widgets', () => {
    registry.register(dummyWidget);
    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('dummy-clock');
  });

  it('filters widgets by category', () => {
    registry.register(dummyWidget);
    const utilities = registry.getByCategory('utilities');
    expect(utilities).toHaveLength(1);

    const productivity = registry.getByCategory('productivity');
    expect(productivity).toHaveLength(0);
  });
});
