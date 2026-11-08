import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../utils/cn';

export const WORKSPACE_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#f43f5e', label: 'Rose' },
  { hex: '#0ea5e9', label: 'Sky' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#64748b', label: 'Slate' },
  { hex: '#6b7280', label: 'Neutral' },
];

export interface WorkspaceColorPickerProps {
  value?: string | null;
  onChange: (colorHex: string | null) => void;
  className?: string;
}

export const WorkspaceColorPicker: React.FC<WorkspaceColorPickerProps> = ({
  value,
  onChange,
  className,
}) => {
  const options = [...WORKSPACE_COLORS.map((c) => c.hex), null];

  const handleKeyDown = (e: React.KeyboardEvent, currentVal: string | null) => {
    const currentIndex = options.findIndex((opt) =>
      opt === null ? currentVal === null : opt.toLowerCase() === currentVal?.toLowerCase()
    );
    if (currentIndex === -1) return;

    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + options.length) % options.length;
    }

    if (targetIndex !== -1) {
      onChange(options[targetIndex]);
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label id="workspace-color-label" className="text-xs font-medium text-foreground block">
        Workspace Color
      </label>
      <div
        role="radiogroup"
        aria-labelledby="workspace-color-label"
        className="flex items-center gap-1.5 flex-wrap p-2 bg-secondary/30 rounded-lg border border-border/50"
      >
        {WORKSPACE_COLORS.map((swatch) => {
          const isSelected = value?.toLowerCase() === swatch.hex.toLowerCase();

          return (
            <button
              key={swatch.hex}
              type="button"
              role="radio"
              tabIndex={isSelected ? 0 : -1}
              aria-checked={isSelected}
              aria-label={swatch.label}
              title={swatch.label}
              onClick={() => onChange(swatch.hex)}
              onKeyDown={(e) => handleKeyDown(e, swatch.hex)}
              style={{ backgroundColor: swatch.hex }}
              className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary shadow-xs',
                isSelected
                  ? 'scale-110 ring-2 ring-foreground/60'
                  : 'hover:scale-105 opacity-85 hover:opacity-100'
              )}
            >
              {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
            </button>
          );
        })}

        {/* Clear Color Button */}
        <button
          type="button"
          role="radio"
          tabIndex={!value ? 0 : -1}
          aria-checked={!value}
          aria-label="Default color"
          onClick={() => onChange(null)}
          onKeyDown={(e) => handleKeyDown(e, null)}
          className={cn(
            'px-2 py-1 h-7 text-[11px] font-medium rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            !value
              ? 'bg-secondary text-foreground border-border'
              : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/60'
          )}
        >
          Default
        </button>
      </div>
    </div>
  );
};
