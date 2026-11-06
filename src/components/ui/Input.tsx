import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, type = 'text', disabled, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1">
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-2.5 flex items-center pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={cn(
              'w-full h-9 rounded-md border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/70',
              'transition-all duration-150',
              'border-border hover:border-border/80',
              'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-8',
              rightIcon && 'pr-8',
              error && 'border-destructive focus:ring-destructive focus:border-destructive',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-2.5 flex items-center text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-[11px] text-destructive font-medium pl-0.5">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
