import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { IconButton } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ariaLabel?: string;
}

const sizeStyles: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  ariaLabel,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            const hasAutofocus = modalRef.current.querySelector<HTMLElement>('[autofocus]');
            if (!hasAutofocus) {
              focusable[0].focus();
            }
          } else {
            modalRef.current.focus();
          }
        }
      }, 30);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCloseRef.current();
        } else if (e.key === 'Tab' && modalRef.current) {
          const focusable = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );
          if (focusable.length === 0) {
            e.preventDefault();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (
              document.activeElement === first ||
              !modalRef.current.contains(document.activeElement)
            ) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (
              document.activeElement === last ||
              !modalRef.current.contains(document.activeElement)
            ) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
        if (
          previousActiveElement.current &&
          typeof previousActiveElement.current.focus === 'function'
        ) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150 motion-reduce:animate-none"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative w-full z-50 my-auto rounded-xl border border-border bg-card text-card-foreground shadow-2xl outline-none max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden',
          'animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none',
          sizeStyles[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="shrink-0 flex items-start justify-between p-5 pb-3 border-b border-border/40">
            <div className="space-y-1 pr-6">
              {title && (
                <h3 id={titleId} className="text-base font-semibold leading-none text-foreground">
                  {title}
                </h3>
              )}
              {description && (
                <p id={descId} className="text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Close dialog"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2 p-4 pt-3 border-t border-border/40 bg-secondary/20 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export const Dialog = Modal;
