import { Breakpoint } from '../../../types/database';

export type PresetCategory = 'personal' | 'study' | 'development' | 'productivity';

export interface PresetBreakpointLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface PresetWidgetDefinition {
  widgetType: string;
  config: Record<string, unknown>;
  layout: Record<Breakpoint, PresetBreakpointLayout>;
}

export interface PresetPreview {
  highlights: string[];
}

export interface WorkspacePreset {
  id: string;
  version: number;
  name: string;
  description: string;
  category: PresetCategory;
  icon: string;
  color: string | null;
  preview: PresetPreview;
  widgets: PresetWidgetDefinition[];
}
