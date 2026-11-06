import React from 'react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border/80 bg-card/40',
        className
      )}
    >
      {icon && (
        <div className="h-10 w-10 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-muted-foreground mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
      {description && <p className="text-xs text-muted-foreground max-w-xs mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
