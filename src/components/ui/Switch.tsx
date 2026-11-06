import React from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  id,
  size = 'md',
  className,
}) => {
  const generatedId = React.useId();
  const switchId = id || generatedId;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onCheckedChange(!checked);
    }
  };

  const isSm = size === 'sm';

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isSm ? 'h-4 w-7' : 'h-5 w-9',
          checked ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/40',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
            isSm
              ? cn('h-3 w-3 mt-0.5', checked ? 'translate-x-3.5' : 'translate-x-0.5')
              : cn('h-4 w-4 mt-0.5', checked ? 'translate-x-4.5' : 'translate-x-0.5')
          )}
        />
      </button>
      {label && (
        <label
          htmlFor={switchId}
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
