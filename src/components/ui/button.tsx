'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantStyles = {
  primary: [
    'bg-primary text-white',
    'hover:bg-primary-hover',
    'active:bg-primary',
    'disabled:bg-primary/50',
    'shadow-sm hover:shadow-md',
  ].join(' '),
  secondary: [
    'bg-surface border border-border text-foreground',
    'hover:bg-surface-hover hover:border-border-hover',
    'active:bg-surface-active',
    'disabled:opacity-50',
  ].join(' '),
  ghost: [
    'bg-transparent text-foreground-muted',
    'hover:bg-surface-hover hover:text-foreground',
    'active:bg-surface-active',
    'disabled:opacity-50',
  ].join(' '),
  danger: [
    'bg-error/10 text-error border border-error/20',
    'hover:bg-error/20 hover:border-error/30',
    'active:bg-error/30',
    'disabled:opacity-50',
  ].join(' '),
  success: [
    'bg-success text-white',
    'hover:bg-success/90',
    'active:bg-success/80',
    'disabled:bg-success/50',
  ].join(' '),
};

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
};

const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin', className)}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          // Custom className
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <Spinner className={iconSize} />
            <span className="opacity-70">{children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className={cn('flex-shrink-0', iconSize)}>{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span className={cn('flex-shrink-0', iconSize)}>{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
