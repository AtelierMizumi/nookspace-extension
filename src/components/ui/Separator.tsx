import React from 'react';
import { cn } from '../../utils/cn';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  className,
}) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-border/60',
        orientation === 'horizontal' ? 'h-[1px] w-full my-1' : 'h-full w-[1px] mx-1',
        className
      )}
    />
  );
};
