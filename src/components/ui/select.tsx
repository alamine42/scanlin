'use client';

import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, icon, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              'w-full appearance-none',
              'bg-background-subtle border border-border rounded-md',
              'px-3 py-2 pr-10 text-sm text-foreground',
              'hover:border-border-hover',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150',
              // Touch target for mobile
              'min-h-[44px] md:min-h-0',
              icon && 'pl-10',
              error && 'border-error focus:ring-error focus:border-error',
              className
            )}
            {...props}
          >
            {children}
          </select>
          {/* Chevron icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-error">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Option component for consistent styling
export interface SelectOptionProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

export function SelectOption({ value, children, disabled }: SelectOptionProps) {
  return (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  );
}
