import React from 'react';
import { cn } from '../../utils/cn';

export interface IconContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'rounded' | 'circle';
  variant?: 'surface' | 'outline' | 'filled';
}

const sizeStyles: Record<NonNullable<IconContainerProps['size']>, string> = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-12 w-12 text-lg',
};

const variantStyles: Record<NonNullable<IconContainerProps['variant']>, string> = {
  surface: 'bg-secondary/70 border border-border/50 text-foreground',
  outline: 'bg-transparent border border-border text-foreground',
  filled: 'bg-primary text-primary-foreground border-transparent',
};

export const IconContainer: React.FC<IconContainerProps> = ({
  size = 'md',
  shape = 'rounded',
  variant = 'surface',
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-medium shrink-0 transition-colors select-none',
        shape === 'circle' ? 'rounded-full' : 'rounded-lg',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
