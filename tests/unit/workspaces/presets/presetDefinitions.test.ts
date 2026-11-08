import { describe, it, expect } from 'vitest';
import { widgetRegistry } from '@/features/widget-system/WidgetRegistry';
import '@/widgets'; // Ensure widgets are registered in widgetRegistry
import {
  minimalistPreset,
  deepStudyPreset,
  developerPreset,
  fullStudioPreset,
} from '@/features/workspaces/presets/definitions';
import { WORKSPACE_ICONS } from '@/features/workspaces/components/WorkspaceIconPicker';

describe('Built-in Preset Definitions', () => {
  const allPresets = [
    { preset: minimalistPreset, expectedWidgets: 4, category: 'personal', icon: 'Home', color: null },
    { preset: deepStudyPreset, expectedWidgets: 7, category: 'study', icon: 'GraduationCap', color: '#10b981' },
    { preset: developerPreset, expectedWidgets: 6, category: 'development', icon: 'Code', color: '#8b5cf6' },
    { preset: fullStudioPreset, expectedWidgets: 10, category: 'productivity', icon: 'Sparkles', color: '#6366f1' },
  ];

  it('ensures all widget types used in presets exist in the WidgetRegistry', () => {
    for (const { preset } of allPresets) {
      for (const widget of preset.widgets) {
        const registered = widgetRegistry.get(widget.widgetType);
        expect(
          registered,
          `Widget type '${widget.widgetType}' in preset '${preset.id}' must be registered in WidgetRegistry`
        ).toBeDefined();
      }
    }
  });

  it('ensures presets have valid metadata and icons', () => {
    for (const { preset, category, icon, color } of allPresets) {
      expect(preset.category).toBe(category);
      expect(preset.icon).toBe(icon);
      expect(WORKSPACE_ICONS[preset.icon]).toBeDefined();
      expect(preset.color).toBe(color);
      expect(preset.preview.highlights.length).toBeGreaterThan(0);
      expect(preset.version).toBeGreaterThanOrEqual(1);
    }
  });

  it('strictly prohibits workspaceId or generated instance id inside preset widgets', () => {
    for (const { preset } of allPresets) {
      expect((preset as unknown as Record<string, unknown>).workspaceId).toBeUndefined();
      for (const widget of preset.widgets) {
        expect((widget as unknown as Record<string, unknown>).workspaceId).toBeUndefined();
        expect((widget as unknown as Record<string, unknown>).id).toBeUndefined();
      }
    }
  });

  it('strictly prohibits user data inside preset widget configs', () => {
    for (const { preset } of allPresets) {
      for (const widget of preset.widgets) {
        // Quick links must not contain personal bookmarks
        if (widget.widgetType === 'quick-links') {
          const links = (widget.config as { links?: unknown[] }).links;
          expect(Array.isArray(links)).toBe(true);
          expect(links?.length).toBe(0);
        }

        // Notes must not have hardcoded notes content
        if (widget.widgetType === 'notes') {
          expect((widget.config as Record<string, unknown>).content).toBeUndefined();
          expect((widget.config as Record<string, unknown>).collectionId).toBeNull();
        }

        // Todo must not have pre-seeded personal user tasks
        if (widget.widgetType === 'todo') {
          expect((widget.config as Record<string, unknown>).tasks).toBeUndefined();
        }

        // Smart bookmarks must not be bound to a hardcoded folder
        if (widget.widgetType === 'smart-bookmarks') {
          expect((widget.config as Record<string, unknown>).folderId).toBeNull();
        }
      }
    }
  });

  describe('Minimalist Preset', () => {
    it('contains the 4 essential foundation widgets', () => {
      const types = minimalistPreset.widgets.map((w) => w.widgetType);
      expect(types).toEqual(['greeting', 'clock', 'quick-links', 'todo']);
    });
  });

  describe('Deep Study Preset', () => {
    it('contains all 7 study and focus widgets', () => {
      const types = deepStudyPreset.widgets.map((w) => w.widgetType);
      expect(types).toEqual([
        'greeting',
        'clock',
        'pomodoro',
        'daily-goals',
        'study-tracker',
        'todo',
        'notes',
      ]);
    });
  });

  describe('Developer Preset', () => {
    it('contains all 6 engineering workflow widgets', () => {
      const types = developerPreset.widgets.map((w) => w.widgetType);
      expect(types).toEqual([
        'clock',
        'quick-links',
        'smart-bookmarks',
        'notes',
        'todo',
        'calendar-overview',
      ]);
    });
  });

  describe('Full Studio Preset', () => {
    it('contains all 10 core NookSpace widgets', () => {
      const types = fullStudioPreset.widgets.map((w) => w.widgetType);
      expect(types).toHaveLength(10);
      expect(types).toEqual([
        'greeting',
        'clock',
        'quick-links',
        'pomodoro',
        'daily-goals',
        'study-tracker',
        'todo',
        'calendar-overview',
        'smart-bookmarks',
        'notes',
      ]);
    });
  });
});
