import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1">
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full min-h-[80px] rounded-md border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70',
            'transition-all duration-150',
            'border-border hover:border-border/80',
            'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring',
            'disabled:cursor-not-allowed disabled:opacity-50 resize-y',
            error && 'border-destructive focus:ring-destructive focus:border-destructive',
            className
          )}
          {...props}
        />
        {error && <span className="text-[11px] text-destructive font-medium pl-0.5">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
