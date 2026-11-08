import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutGrid, Check } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { WorkspaceIconPicker, getWorkspaceIcon } from './WorkspaceIconPicker';
import { WorkspaceColorPicker } from './WorkspaceColorPicker';
import { WorkspaceEntity } from '../../../types/workspaces';
import { getAllPresets } from '../presets/presetRegistry';
import { WorkspacePreset } from '../presets/types';
import { cn } from '../../../utils/cn';

export interface WorkspaceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialWorkspace?: WorkspaceEntity | null;
  onSubmitCreate?: (data: {
    name: string;
    icon: string;
    color?: string;
    presetId?: string | null;
  }) => Promise<void>;
  onSubmitEdit?: (
    id: string,
    data: { name: string; icon: string; color: string | null }
  ) => Promise<void>;
}

export const WorkspaceFormModal: React.FC<WorkspaceFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialWorkspace,
  onSubmitCreate,
  onSubmitEdit,
}) => {
  const [createMode, setCreateMode] = useState<'preset' | 'blank'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('LayoutGrid');
  const [color, setColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const presets = getAllPresets();

  // Sync state when modal opens or initialWorkspace changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialWorkspace) {
        setName(initialWorkspace.name);
        setIcon(initialWorkspace.icon || 'LayoutGrid');
        setColor(initialWorkspace.color || null);
        setSelectedPresetId(null);
      } else {
        setName('');
        setIcon('LayoutGrid');
        setColor(null);
        setSelectedPresetId(null);
        setCreateMode('preset');
      }
      setValidationError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, mode, initialWorkspace]);

  const handleSelectPreset = (preset: WorkspacePreset) => {
    setSelectedPresetId(preset.id);
    setName(preset.name);
    setIcon(preset.icon);
    setColor(preset.color || null);
    if (validationError) setValidationError(null);
  };

  const handleSwitchToBlank = () => {
    setCreateMode('blank');
    setSelectedPresetId(null);
    setName('');
    setIcon('LayoutGrid');
    setColor(null);
    if (validationError) setValidationError(null);
  };

  const handleSwitchToPreset = () => {
    setCreateMode('preset');
    if (validationError) setValidationError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError('Workspace name is required');
      return;
    }
    if (trimmed.length > 50) {
      setValidationError('Workspace name must be 50 characters or less');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        if (onSubmitCreate) {
          const payload = {
            name: trimmed,
            icon,
            color: color || undefined,
            ...(createMode === 'preset' && selectedPresetId ? { presetId: selectedPresetId } : {}),
          };
          await onSubmitCreate(payload);
        }
      } else if (mode === 'edit' && initialWorkspace) {
        if (onSubmitEdit) {
          await onSubmitEdit(initialWorkspace.id, {
            name: trimmed,
            icon,
            color,
          });
        }
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      setValidationError(err instanceof Error ? err.message : 'Failed to save workspace');
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={isEdit ? 'Edit Workspace' : 'Create New Workspace'}
      description={
        isEdit
          ? 'Update workspace name, icon, and accent color.'
          : 'Choose a starter preset or create a blank workspace for your workflow.'
      }
      size={isEdit ? 'md' : 'lg'}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isSubmitting
              ? isEdit
                ? 'Saving...'
                : 'Creating...'
              : isEdit
              ? 'Save Changes'
              : 'Create Workspace'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Creation Mode Tabs (Only in Create mode) */}
        {!isEdit && (
          <div
            className="flex items-center gap-1.5 p-1 bg-secondary/40 rounded-lg border border-border/50"
          >
            <button
              type="button"
              aria-pressed={createMode === 'preset'}
              onClick={handleSwitchToPreset}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-all text-xs',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                createMode === 'preset'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Starter Presets</span>
            </button>
            <button
              type="button"
              aria-pressed={createMode === 'blank'}
              onClick={handleSwitchToBlank}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-all text-xs',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                createMode === 'blank'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Blank Workspace</span>
            </button>
          </div>
        )}

        {/* Preset Cards Selection */}
        {!isEdit && createMode === 'preset' && (
          <div className="space-y-2">
            <label id="presets-label" className="font-medium text-foreground block text-xs">
              Select Preset
            </label>
            <div
              role="radiogroup"
              aria-labelledby="presets-label"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[36vh] sm:max-h-none overflow-y-auto pr-0.5"
            >
              {presets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const IconComponent = getWorkspaceIcon(preset.icon);

                return (
                  <div
                    key={preset.id}
                    role="radio"
                    tabIndex={0}
                    aria-checked={isSelected}
                    aria-label={preset.name}
                    onClick={() => handleSelectPreset(preset)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleSelectPreset(preset);
                      }
                    }}
                    className={cn(
                      'p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between relative group select-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/25 bg-primary/[0.04]'
                        : 'border-border/60 bg-card hover:border-border hover:bg-secondary/30'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-primary-foreground shadow-xs shrink-0"
                            style={{
                              backgroundColor: preset.color || '#6366f1',
                            }}
                            aria-hidden="true"
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-xs block leading-tight truncate">
                              {preset.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {preset.category}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" size="sm" className="text-[10px] shrink-0 font-normal">
                          {preset.widgets.length} widgets
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-border/40 mt-1">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {preset.preview.highlights[0]}
                      </span>
                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-primary/70 font-medium group-hover:text-primary">
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 1. Name Input */}
        <div>
          <label htmlFor="workspace-name-input" className="font-medium text-foreground block mb-1.5">
            Workspace Name <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <Input
            id="workspace-name-input"
            autoFocus={isEdit || createMode === 'blank'}
            placeholder="e.g. Japanese Study, Project Alpha, Work..."
            value={name}
            maxLength={50}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'workspace-name-error' : undefined}
            onChange={(e) => {
              setName(e.target.value);
              if (validationError) setValidationError(null);
            }}
          />
          <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
            <span id={validationError ? 'workspace-name-error' : undefined} role={validationError ? 'alert' : undefined}>
              {validationError ? (
                <span className="text-destructive font-medium">{validationError}</span>
              ) : (
                '1–50 characters'
              )}
            </span>
            <span aria-label={`${name.length} of 50 characters`}>{name.length}/50</span>
          </div>
        </div>

        {/* 2. Icon Picker */}
        <WorkspaceIconPicker value={icon} onChange={setIcon} />

        {/* 3. Color Picker */}
        <WorkspaceColorPicker value={color} onChange={setColor} />
      </form>
    </Modal>
  );
};
