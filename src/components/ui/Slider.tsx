import React from 'react';
import { cn } from '../../utils/cn';

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  valueDisplay?: string | number;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  label,
  valueDisplay,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={cn('w-full flex flex-col gap-1.5 select-none', className)}>
      {(label || valueDisplay !== undefined) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          {label && <span>{label}</span>}
          {valueDisplay !== undefined && <span className="tabular-nums font-mono text-foreground">{valueDisplay}</span>}
        </div>
      )}
      <div className="relative flex items-center w-full h-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            'w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Custom slider thumb styling
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary',
            '[&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-sm'
          )}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, hsl(var(--secondary)) ${percentage}%, hsl(var(--secondary)) 100%)`,
          }}
        />
      </div>
    </div>
  );
};
