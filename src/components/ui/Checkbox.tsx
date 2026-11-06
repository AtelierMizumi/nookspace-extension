import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  id,
  className,
  'aria-label': ariaLabel,
}) => {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onCheckedChange(!checked);
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-2 select-none', className)}>
      <button
        type="button"
        role="checkbox"
        id={checkboxId}
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-4 w-4 shrink-0 rounded border transition-colors flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          checked
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-border bg-card hover:border-border/80',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </button>
      {label && (
        <label
          htmlFor={checkboxId}
          className={cn(
            'text-sm font-normal text-foreground cursor-pointer select-none',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};
