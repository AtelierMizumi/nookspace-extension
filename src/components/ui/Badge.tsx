import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md';
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-primary text-primary-foreground border-transparent',
  secondary: 'bg-secondary text-secondary-foreground border-border/40',
  outline: 'bg-transparent text-foreground border-border',
  success: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
  destructive: 'bg-destructive/15 text-destructive border-destructive/20',
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] font-medium tracking-wide',
  md: 'px-2.5 py-0.5 text-xs font-medium',
};

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'secondary',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border transition-colors select-none font-sans',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
