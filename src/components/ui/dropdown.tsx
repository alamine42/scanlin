'use client';

import {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';

// Context for dropdown state
interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown');
  }
  return context;
}

// Main Dropdown component
export interface DropdownProps {
  children: ReactNode;
  className?: string;
}

export function Dropdown({ children, className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, activeIndex, setActiveIndex }}>
      <div ref={dropdownRef} className={cn('relative inline-block', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

// Trigger component
export interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

export function DropdownTrigger({ children, className, asChild }: DropdownTriggerProps) {
  const { isOpen, setIsOpen, setActiveIndex } = useDropdown();

  const handleClick = () => {
    setIsOpen(!isOpen);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      setActiveIndex(0);
    }
  };

  if (asChild) {
    return (
      <div
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={className}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'px-3 py-2 text-sm font-medium',
        'bg-surface border border-border rounded-md',
        'text-foreground-muted hover:text-foreground',
        'hover:bg-surface-hover hover:border-border-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'transition-colors duration-150',
        className
      )}
      aria-haspopup="menu"
      aria-expanded={isOpen}
    >
      {children}
      <svg
        className={cn(
          'w-4 h-4 transition-transform duration-150',
          isOpen && 'rotate-180'
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

// Content component
export interface DropdownContentProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function DropdownContent({
  children,
  align = 'start',
  className,
}: DropdownContentProps) {
  const { isOpen } = useDropdown();

  if (!isOpen) return null;

  const alignmentStyles = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div className="fixed inset-0 z-40 md:hidden" aria-hidden="true" />

      {/* Dropdown menu */}
      <div
        className={cn(
          'absolute z-50 mt-2 min-w-[12rem] max-w-[20rem]',
          'bg-background-elevated border border-border rounded-lg',
          'shadow-lg overflow-hidden',
          'animate-scale-in origin-top',
          alignmentStyles[align],
          // Mobile: full width at bottom
          'max-md:fixed max-md:left-2 max-md:right-2 max-md:bottom-2 max-md:top-auto',
          'max-md:max-w-none max-md:mt-0 max-md:rounded-xl',
          className
        )}
        role="menu"
        aria-orientation="vertical"
      >
        <div className="p-1 max-h-[min(400px,60vh)] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}

// Item component
export interface DropdownItemProps {
  children: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function DropdownItem({
  children,
  icon,
  shortcut,
  destructive,
  disabled,
  onClick,
  className,
}: DropdownItemProps) {
  const { setIsOpen } = useDropdown();

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md',
        'text-foreground-muted hover:text-foreground',
        'hover:bg-surface-hover active:bg-surface-active',
        'focus-visible:outline-none focus-visible:bg-surface-hover',
        'transition-colors duration-100',
        // Touch targets for mobile
        'min-h-[44px] md:min-h-0',
        destructive && 'text-error hover:text-error hover:bg-error-muted',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        className
      )}
      role="menuitem"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    >
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left">{children}</span>
      {shortcut && (
        <span className="text-xs text-foreground-subtle ml-auto">{shortcut}</span>
      )}
    </button>
  );
}

// Separator component
export function DropdownSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-px bg-border my-1 mx-2', className)}
      role="separator"
    />
  );
}

// Label component
export function DropdownLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-3 py-1.5 text-xs font-medium text-foreground-subtle uppercase tracking-wider',
        className
      )}
    >
      {children}
    </div>
  );
}
