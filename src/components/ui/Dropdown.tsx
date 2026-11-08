import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';

export interface DropdownItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorAfter?: boolean;
  checked?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  menuAriaLabel?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  className,
  menuAriaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerWrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const closeDropdown = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus && triggerWrapperRef.current) {
      const triggerButton = triggerWrapperRef.current.querySelector<HTMLElement>(
        'button, [tabindex="0"]'
      );
      triggerButton?.focus();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeDropdown(true);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const enabledIndices = items
          .map((item, idx) => (!item.disabled ? idx : -1))
          .filter((idx) => idx !== -1);
        if (enabledIndices.length === 0) return;
        const currentIndex = itemRefs.current.findIndex((el) => el === document.activeElement);
        const currentPos = enabledIndices.indexOf(currentIndex);
        const nextPos = (currentPos + 1) % enabledIndices.length;
        itemRefs.current[enabledIndices[nextPos]]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const enabledIndices = items
          .map((item, idx) => (!item.disabled ? idx : -1))
          .filter((idx) => idx !== -1);
        if (enabledIndices.length === 0) return;
        const currentIndex = itemRefs.current.findIndex((el) => el === document.activeElement);
        const currentPos = enabledIndices.indexOf(currentIndex);
        const prevPos = (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
        itemRefs.current[enabledIndices[prevPos]]?.focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        const firstEnabled = items.findIndex((item) => !item.disabled);
        if (firstEnabled !== -1) itemRefs.current[firstEnabled]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        for (let i = items.length - 1; i >= 0; i--) {
          if (!items[i].disabled) {
            itemRefs.current[i]?.focus();
            break;
          }
        }
      } else if (event.key === 'Tab') {
        closeDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, items, closeDropdown]);

  // Autofocus first enabled menuitem when opening
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const firstEnabledIndex = items.findIndex((item) => !item.disabled);
        if (firstEnabledIndex !== -1 && itemRefs.current[firstEnabledIndex]) {
          itemRefs.current[firstEnabledIndex]?.focus();
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, items]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      <div
        ref={triggerWrapperRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className="cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          aria-label={menuAriaLabel}
          className={cn(
            'absolute z-50 mt-1 min-w-[180px] max-w-[280px] p-1 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
            'animate-in fade-in zoom-in-95 duration-100 motion-reduce:animate-none',
            'max-h-[75vh] overflow-y-auto',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {items.map((item, index) => {
            const isRadio = item.checked !== undefined;
            return (
              <React.Fragment key={item.id}>
                <button
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  role={isRadio ? 'menuitemradio' : 'menuitem'}
                  aria-checked={isRadio ? item.checked : undefined}
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onClick?.();
                    closeDropdown(true);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md text-left transition-colors select-none',
                    'focus-visible:outline-none focus-visible:bg-secondary focus-visible:text-foreground',
                    item.destructive
                      ? 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10'
                      : 'text-foreground hover:bg-secondary',
                    item.checked && 'bg-primary/5 text-primary font-semibold',
                    item.disabled && 'opacity-50 pointer-events-none cursor-not-allowed'
                  )}
                >
                  {item.icon && <span className="h-4 w-4 shrink-0">{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
                {item.separatorAfter && <div className="h-[1px] bg-border/50 my-1 -mx-1" />}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
