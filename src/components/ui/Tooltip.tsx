import React, { useState } from 'react';
import { cn } from '../../utils/cn';

export interface TooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  delayMs?: number;
  className?: string;
}

const positionStyles: Record<NonNullable<TooltipProps['position']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
  delayMs = 150,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const show = () => {
    const id = setTimeout(() => setIsVisible(true), delayMs);
    setTimeoutId(id);
  };

  const hide = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2.5 py-1 text-[11px] font-medium leading-none text-foreground bg-popover border border-border/80 rounded-md shadow-md pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100',
            positionStyles[position],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
