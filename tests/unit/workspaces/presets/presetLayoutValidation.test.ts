import { describe, it, expect } from 'vitest';
import { BREAKPOINT_COLUMNS, Breakpoint } from '@/types/database';
import { PRESET_BREAKPOINTS } from '@/features/workspaces/presets/presetSchema';
import { getAllPresets } from '@/features/workspaces/presets/presetRegistry';

describe('Preset Layout Validation across All Breakpoints', () => {
  const presets = getAllPresets();

  it('guarantees that every preset defines coordinates for all 5 breakpoints', () => {
    for (const preset of presets) {
      for (const widget of preset.widgets) {
        for (const bp of PRESET_BREAKPOINTS) {
          const bpLayout = widget.layout[bp];
          expect(
            bpLayout,
            `Widget '${widget.widgetType}' in preset '${preset.id}' must have layout for breakpoint '${bp}'`
          ).toBeDefined();
          expect(bpLayout.x).toBeGreaterThanOrEqual(0);
          expect(bpLayout.y).toBeGreaterThanOrEqual(0);
          expect(bpLayout.w).toBeGreaterThanOrEqual(1);
          expect(bpLayout.h).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('guarantees that no widget exceeds breakpoint max columns (x + w <= maxCols)', () => {
    for (const preset of presets) {
      for (const widget of preset.widgets) {
        for (const bp of PRESET_BREAKPOINTS) {
          const maxCols = BREAKPOINT_COLUMNS[bp];
          const { x, w } = widget.layout[bp];
          expect(
            x + w,
            `Widget '${widget.widgetType}' in preset '${preset.id}' on breakpoint '${bp}' exceeds max columns (x: ${x} + w: ${w} = ${x + w} > maxCols: ${maxCols})`
          ).toBeLessThanOrEqual(maxCols);
        }
      }
    }
  });

  it('guarantees ZERO overlapping widgets for all presets on every breakpoint', () => {
    for (const preset of presets) {
      for (const bp of PRESET_BREAKPOINTS) {
        const widgets = preset.widgets;
        for (let i = 0; i < widgets.length; i++) {
          const a = widgets[i].layout[bp];
          for (let j = i + 1; j < widgets.length; j++) {
            const b = widgets[j].layout[bp];

            const overlap =
              a.x < b.x + b.w &&
              a.x + a.w > b.x &&
              a.y < b.y + b.h &&
              a.y + a.h > b.y;

            expect(
              overlap,
              `Collision detected in preset '${preset.id}' on breakpoint '${bp}' between '${widgets[i].widgetType}' [x:${a.x}, y:${a.y}, w:${a.w}, h:${a.h}] and '${widgets[j].widgetType}' [x:${b.x}, y:${b.y}, w:${b.w}, h:${b.h}]`
            ).toBe(false);
          }
        }
      }
    }
  });

  it('guarantees that w and h respect minW and minH where specified', () => {
    for (const preset of presets) {
      for (const widget of preset.widgets) {
        for (const bp of PRESET_BREAKPOINTS) {
          const { w, h, minW, minH } = widget.layout[bp];
          if (minW !== undefined) {
            expect(w).toBeGreaterThanOrEqual(minW);
          }
          if (minH !== undefined) {
            expect(h).toBeGreaterThanOrEqual(minH);
          }
        }
      }
    }
  });
});
