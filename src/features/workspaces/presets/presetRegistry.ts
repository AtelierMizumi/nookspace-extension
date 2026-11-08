import { WorkspacePreset, PresetCategory } from './types';
import { validateWorkspacePreset, WorkspacePresetValidationResult } from './presetSchema';
import {
  minimalistPreset,
  deepStudyPreset,
  developerPreset,
  fullStudioPreset,
} from './definitions';

/**
 * Deep freezes an object recursively to guarantee immutability.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Freeze properties first
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }

  return Object.freeze(obj);
}

/**
 * Built-in workspace presets raw array.
 */
const BUILTIN_PRESETS_RAW: WorkspacePreset[] = [
  minimalistPreset,
  deepStudyPreset,
  developerPreset,
  fullStudioPreset,
];

// Deep freeze all built-in presets
const BUILTIN_PRESETS: readonly WorkspacePreset[] = Object.freeze(
  BUILTIN_PRESETS_RAW.map((p) => deepFreeze(p))
);

const PRESET_MAP = new Map<string, WorkspacePreset>(
  BUILTIN_PRESETS.map((p) => [p.id, p])
);

/**
 * Retrieve all registered built-in workspace presets.
 */
export function getAllPresets(): readonly WorkspacePreset[] {
  return BUILTIN_PRESETS;
}

/**
 * Retrieve a preset by its unique ID.
 */
export function getPresetById(id: string): WorkspacePreset | undefined {
  return PRESET_MAP.get(id);
}

/**
 * Retrieve all presets belonging to a specific category.
 */
export function getPresetsByCategory(category: PresetCategory | string): readonly WorkspacePreset[] {
  return BUILTIN_PRESETS.filter((p) => p.category === category);
}

/**
 * Checks whether an ID belongs to a registered built-in preset.
 */
export function isPresetId(id: string): boolean {
  return PRESET_MAP.has(id);
}

/**
 * Validates any preset object against the WorkspacePresetSchema.
 */
export function validatePreset(preset: unknown): WorkspacePresetValidationResult {
  return validateWorkspacePreset(preset);
}
