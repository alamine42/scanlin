'use client';

import {
  useEffect,
  useRef,
  createContext,
  useContext,
  ReactNode,
  HTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from './button';

// Context for dialog state
interface DialogContextType {
  onClose: () => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

// Main Dialog component
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ open, onClose, children }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  // Use portal to render at body level
  return createPortal(
    <DialogContext.Provider value={{ onClose }}>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className={cn(
          'fixed inset-0 z-50',
          'bg-black/60 backdrop-blur-sm',
          'animate-fade-in'
        )}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4',
          // Mobile: align to bottom
          'max-md:items-end max-md:p-0'
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </DialogContext.Provider>,
    document.body
  );
}

// Content component
export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function DialogContent({
  size = 'md',
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <div
      className={cn(
        'w-full',
        sizeStyles[size],
        'bg-background-elevated border border-border rounded-xl',
        'shadow-lg overflow-hidden',
        'animate-slide-up',
        // Mobile: full width, rounded top only
        'max-md:max-w-none max-md:rounded-b-none max-md:max-h-[90vh]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Header component
export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  showClose?: boolean;
}

export function DialogHeader({
  showClose = true,
  className,
  children,
  ...props
}: DialogHeaderProps) {
  const { onClose } = useDialog();

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 p-6 pb-0',
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {showClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'flex-shrink-0 p-1.5 -m-1.5 rounded-md',
            'text-foreground-subtle hover:text-foreground',
            'hover:bg-surface-hover',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'transition-colors'
          )}
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Title component
export function DialogTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    >
      {children}
    </h2>
  );
}

// Description component
export function DialogDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('mt-1 text-sm text-foreground-muted', className)}
      {...props}
    >
      {children}
    </p>
  );
}

// Body component
export function DialogBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('p-6 overflow-y-auto', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Footer component
export function DialogFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 p-6 pt-0',
        // Mobile: stack buttons
        'max-md:flex-col max-md:gap-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Confirm Dialog - preset for confirmation flows
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const confirmButtonVariant: ButtonProps['variant'] = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="pt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="max-md:w-full"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmButtonVariant}
            onClick={handleConfirm}
            loading={loading}
            className="max-md:w-full"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
