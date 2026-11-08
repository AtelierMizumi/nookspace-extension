import { describe, it, expect } from 'vitest';
import {
  getAllPresets,
  getPresetById,
  getPresetsByCategory,
  isPresetId,
  validatePreset,
} from '@/features/workspaces/presets/presetRegistry';

describe('Preset Registry', () => {
  it('registers exactly 4 built-in presets', () => {
    const presets = getAllPresets();
    expect(presets).toHaveLength(4);
    const ids = presets.map((p) => p.id);
    expect(ids).toContain('minimalist');
    expect(ids).toContain('deep-study');
    expect(ids).toContain('developer');
    expect(ids).toContain('full-studio');
  });

  it('guarantees unique IDs across all registered presets', () => {
    const presets = getAllPresets();
    const ids = presets.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(presets.length);
  });

  it('retrieves presets by ID', () => {
    const minimalist = getPresetById('minimalist');
    expect(minimalist).toBeDefined();
    expect(minimalist?.name).toBe('Minimalist');

    const deepStudy = getPresetById('deep-study');
    expect(deepStudy).toBeDefined();
    expect(deepStudy?.category).toBe('study');

    const developer = getPresetById('developer');
    expect(developer).toBeDefined();
    expect(developer?.category).toBe('development');

    const fullStudio = getPresetById('full-studio');
    expect(fullStudio).toBeDefined();
    expect(fullStudio?.category).toBe('productivity');

    expect(getPresetById('non-existent-id')).toBeUndefined();
  });

  it('checks if an ID belongs to a registered preset with isPresetId', () => {
    expect(isPresetId('minimalist')).toBe(true);
    expect(isPresetId('deep-study')).toBe(true);
    expect(isPresetId('developer')).toBe(true);
    expect(isPresetId('full-studio')).toBe(true);
    expect(isPresetId('unknown-id')).toBe(false);
  });

  it('filters presets by category', () => {
    const personal = getPresetsByCategory('personal');
    expect(personal).toHaveLength(1);
    expect(personal[0].id).toBe('minimalist');

    const study = getPresetsByCategory('study');
    expect(study).toHaveLength(1);
    expect(study[0].id).toBe('deep-study');

    const dev = getPresetsByCategory('development');
    expect(dev).toHaveLength(1);
    expect(dev[0].id).toBe('developer');

    const prod = getPresetsByCategory('productivity');
    expect(prod).toHaveLength(1);
    expect(prod[0].id).toBe('full-studio');

    expect(getPresetsByCategory('non-existent')).toHaveLength(0);
  });

  it('guarantees preset immutability via deep freeze', () => {
    const preset = getPresetById('minimalist');
    expect(preset).toBeDefined();
    expect(Object.isFrozen(preset)).toBe(true);
    expect(Object.isFrozen(preset?.preview)).toBe(true);
    expect(Object.isFrozen(preset?.widgets)).toBe(true);

    if (preset) {
      expect(() => {
        // Attempting to mutate a frozen object in strict mode throws TypeError
        (preset as { name: string }).name = 'Hacked Name';
      }).toThrow();
    }
  });

  it('validates every registered preset against the schema without errors', () => {
    const presets = getAllPresets();
    for (const preset of presets) {
      const validation = validatePreset(preset);
      expect(validation.success).toBe(true);
    }
  });
});
