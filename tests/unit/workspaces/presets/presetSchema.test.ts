import { describe, it, expect } from 'vitest';
import {
  WorkspacePresetSchema,
  PresetBreakpointLayoutSchema,
  PresetWidgetDefinitionSchema,
  validateWorkspacePreset,
} from '@/features/workspaces/presets/presetSchema';
import { minimalistPreset } from '@/features/workspaces/presets/definitions/minimalist';

describe('Preset Schemas', () => {
  describe('PresetBreakpointLayoutSchema', () => {
    it('validates a correct layout object', () => {
      const valid = { x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 };
      const parsed = PresetBreakpointLayoutSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects negative coordinates or zero dimensions', () => {
      expect(PresetBreakpointLayoutSchema.safeParse({ x: -1, y: 0, w: 4, h: 2 }).success).toBe(false);
      expect(PresetBreakpointLayoutSchema.safeParse({ x: 0, y: -1, w: 4, h: 2 }).success).toBe(false);
      expect(PresetBreakpointLayoutSchema.safeParse({ x: 0, y: 0, w: 0, h: 2 }).success).toBe(false);
      expect(PresetBreakpointLayoutSchema.safeParse({ x: 0, y: 0, w: 4, h: 0 }).success).toBe(false);
    });

    it('rejects non-integer coordinates', () => {
      expect(PresetBreakpointLayoutSchema.safeParse({ x: 1.5, y: 0, w: 4, h: 2 }).success).toBe(false);
      expect(PresetBreakpointLayoutSchema.safeParse({ x: 0, y: 0, w: 2.2, h: 2 }).success).toBe(false);
    });

    it('rejects maxW less than minW or maxH less than minH', () => {
      const invalidW = { x: 0, y: 0, w: 4, h: 2, minW: 5, maxW: 3 };
      const parsedW = PresetBreakpointLayoutSchema.safeParse(invalidW);
      expect(parsedW.success).toBe(false);

      const invalidH = { x: 0, y: 0, w: 4, h: 2, minH: 5, maxH: 3 };
      const parsedH = PresetBreakpointLayoutSchema.safeParse(invalidH);
      expect(parsedH.success).toBe(false);
    });
  });

  describe('PresetWidgetDefinitionSchema', () => {
    it('rejects layout exceeding column count for a breakpoint', () => {
      const outOfBounds = {
        widgetType: 'clock',
        config: {},
        layout: {
          lg: { x: 10, y: 0, w: 4, h: 2 }, // 10 + 4 = 14 > 12!
          md: { x: 0, y: 0, w: 4, h: 2 },
          sm: { x: 0, y: 0, w: 4, h: 2 },
          xs: { x: 0, y: 0, w: 4, h: 2 },
          xxs: { x: 0, y: 0, w: 2, h: 2 },
        },
      };

      const result = PresetWidgetDefinitionSchema.safeParse(outOfBounds);
      expect(result.success).toBe(false);
    });

    it('rejects empty widgetType', () => {
      const emptyType = {
        widgetType: '   ',
        config: {},
        layout: {
          lg: { x: 0, y: 0, w: 4, h: 2 },
          md: { x: 0, y: 0, w: 4, h: 2 },
          sm: { x: 0, y: 0, w: 4, h: 2 },
          xs: { x: 0, y: 0, w: 4, h: 2 },
          xxs: { x: 0, y: 0, w: 2, h: 2 },
        },
      };

      const result = PresetWidgetDefinitionSchema.safeParse(emptyType);
      expect(result.success).toBe(false);
    });
  });

  describe('WorkspacePresetSchema', () => {
    it('validates a valid preset definition', () => {
      const result = WorkspacePresetSchema.safeParse(minimalistPreset);
      expect(result.success).toBe(true);
    });

    it('rejects invalid preset IDs', () => {
      const invalid = {
        ...minimalistPreset,
        id: 'Minimalist Preset!', // Contains uppercase and special characters
      };
      expect(WorkspacePresetSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects unknown icons', () => {
      const invalid = {
        ...minimalistPreset,
        icon: 'NonExistentIconName123',
      };
      const result = WorkspacePresetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid hex colors', () => {
      const invalid = {
        ...minimalistPreset,
        color: '#xyz123',
      };
      expect(WorkspacePresetSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects presets with overlapping widgets', () => {
      const overlappingPreset = {
        ...minimalistPreset,
        widgets: [
          {
            widgetType: 'greeting',
            config: {},
            layout: {
              lg: { x: 0, y: 0, w: 6, h: 2 },
              md: { x: 0, y: 0, w: 6, h: 2 },
              sm: { x: 0, y: 0, w: 6, h: 2 },
              xs: { x: 0, y: 0, w: 4, h: 2 },
              xxs: { x: 0, y: 0, w: 2, h: 2 },
            },
          },
          {
            widgetType: 'clock',
            config: {},
            layout: {
              lg: { x: 3, y: 0, w: 6, h: 2 }, // Overlaps with x in [0, 6) on lg!
              md: { x: 0, y: 2, w: 4, h: 2 },
              sm: { x: 0, y: 2, w: 4, h: 2 },
              xs: { x: 0, y: 2, w: 4, h: 2 },
              xxs: { x: 0, y: 2, w: 2, h: 2 },
            },
          },
        ],
      };

      const result = WorkspacePresetSchema.safeParse(overlappingPreset);
      expect(result.success).toBe(false);
    });

    it('rejects empty highlights in preview', () => {
      const invalid = {
        ...minimalistPreset,
        preview: { highlights: [] },
      };
      expect(WorkspacePresetSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects presets with empty widgets array', () => {
      const invalid = {
        ...minimalistPreset,
        widgets: [],
      };
      expect(WorkspacePresetSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('validateWorkspacePreset helper', () => {
    it('returns success: true for valid preset', () => {
      const res = validateWorkspacePreset(minimalistPreset);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe('minimalist');
      }
    });

    it('returns formatted error string and issues for invalid preset', () => {
      const res = validateWorkspacePreset({ id: '' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeDefined();
        expect(res.issues.length).toBeGreaterThan(0);
      }
    });
  });
});
