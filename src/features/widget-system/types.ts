import React from 'react';
import { LucideIcon } from 'lucide-react';

export type WidgetCategory =
  | 'productivity'
  | 'organization'
  | 'learning'
  | 'personal'
  | 'utilities';

export interface WidgetDimensions {
  w: number;
  h: number;
}

export interface WidgetProps<TConfig = Record<string, unknown>> {
  instanceId: string;
  workspaceId: string;
  isEditMode: boolean;
  config: TConfig;
  onUpdateConfig: (newConfig: Partial<TConfig>) => void;
  onRemove: () => void;
}

export interface WidgetSettingsProps<TConfig = Record<string, unknown>> {
  config: TConfig;
  onSaveConfig: (newConfig: Partial<TConfig>) => void;
  onClose: () => void;
}

export interface WidgetDefinition<TConfig = Record<string, unknown>> {
  type: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: LucideIcon;
  defaultConfig: TConfig;
  defaultDimensions: WidgetDimensions;
  minDimensions: WidgetDimensions;
  maxDimensions?: WidgetDimensions;
  component: React.ComponentType<WidgetProps<TConfig>>;
  settingsComponent?: React.ComponentType<WidgetSettingsProps<TConfig>>;
}
