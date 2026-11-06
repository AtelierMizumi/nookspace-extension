import React, { useState } from 'react';
import { HelpCircle, Trash2, Settings, EyeOff, GripVertical } from 'lucide-react';
import { widgetRegistry } from './WidgetRegistry';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { WidgetInstanceEntity } from '../../types/database';
import { IconButton } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../utils/cn';

export interface WidgetRendererProps {
  instance: WidgetInstanceEntity;
  isEditMode: boolean;
  onUpdateConfig: (newConfig: Partial<Record<string, unknown>>) => void;
  onRemove: () => void;
  onToggleEnabled?: () => void;
  className?: string;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  instance,
  isEditMode,
  onUpdateConfig,
  onRemove,
  onToggleEnabled,
  className,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const definition = widgetRegistry.get(instance.widgetType);

  // Fallback for removed or legacy widget types
  if (!definition) {
    return (
      <div className={cn('h-full w-full p-4 rounded-xl border border-dashed border-border bg-card/60 flex flex-col justify-between text-xs', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span className="font-medium text-foreground">Unknown Widget ({instance.widgetType})</span>
        </div>
        <p className="text-[11px] text-muted-foreground my-2">
          This widget type is no longer registered or has been removed.
        </p>
        <div className="flex justify-end">
          <IconButton
            size="sm"
            variant="destructive"
            aria-label="Remove unknown widget"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
    );
  }

  const Component = definition.component;
  const SettingsComponent = definition.settingsComponent;

  return (
    <WidgetErrorBoundary widgetType={instance.widgetType}>
      <div
        className={cn(
          'relative group h-full w-full rounded-xl border transition-all duration-150',
          isEditMode
            ? 'border-primary/40 ring-1 ring-primary/20 shadow-sm bg-card/90'
            : 'border-border bg-card shadow-sm hover:border-border/80',
          !instance.isEnabled && 'opacity-40 grayscale',
          className
        )}
      >
        {/* Edit Mode Top Toolbar Overlay */}
        {isEditMode && (
          <>
            <div className="absolute -top-3 left-2 z-30 flex items-center bg-popover/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-border shadow-md animate-in fade-in duration-100 widget-drag-handle">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </div>
            <div className="absolute -top-3 right-2 z-30 flex items-center gap-1 bg-popover/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-border shadow-md animate-in fade-in duration-100">
            {SettingsComponent && (
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Widget Settings"
                onClick={() => setIsSettingsOpen(true)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3 w-3" />
              </IconButton>
            )}
            {onToggleEnabled && (
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={instance.isEnabled ? 'Disable widget' : 'Enable widget'}
                onClick={onToggleEnabled}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <EyeOff className="h-3 w-3" />
              </IconButton>
            )}
            <IconButton
              size="sm"
              variant="destructive"
              aria-label="Remove Widget"
              onClick={onRemove}
              className="h-6 w-6"
            >
              <Trash2 className="h-3 w-3" />
            </IconButton>
          </div>
          </>
        )}

        {/* Concrete Widget Component */}
        <div className="h-full w-full overflow-hidden p-4">
          <Component
            instanceId={instance.id}
            workspaceId={instance.workspaceId}
            isEditMode={isEditMode}
            config={instance.config}
            onUpdateConfig={onUpdateConfig}
            onRemove={onRemove}
          />
        </div>

        {/* Modal for Widget Specific Settings (if supported) */}
        {SettingsComponent && isSettingsOpen && (
          <Modal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            title={`${definition.name} Settings`}
            description={`Configure settings for this ${definition.name.toLowerCase()} instance.`}
          >
            <SettingsComponent
              config={instance.config}
              onSaveConfig={(newConfig) => {
                onUpdateConfig(newConfig);
                setIsSettingsOpen(false);
              }}
              onClose={() => setIsSettingsOpen(false)}
            />
          </Modal>
        )}
      </div>
    </WidgetErrorBoundary>
  );
};
