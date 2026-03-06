'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variantStyles = {
  default: 'bg-surface border border-border',
  elevated: 'bg-background-elevated border border-border shadow-md',
  interactive: 'bg-surface border border-border cursor-pointer hover:bg-surface-hover hover:border-border-hover active:scale-[0.99] transition-all duration-150',
  outline: 'bg-transparent border border-border',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg',
          variantStyles[variant],
          paddingStyles[padding],
          hover && variant !== 'interactive' && 'hover:border-border-hover transition-colors',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header component
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4', className)}
      {...props}
    >
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-sm font-medium text-foreground truncate">{title}</h3>
        )}
        {description && (
          <p className="mt-0.5 text-xs text-foreground-subtle truncate">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Card Content component
export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-3', className)} {...props}>
      {children}
    </div>
  );
}

// Card Footer component
export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-4 pt-4 border-t border-border flex items-center gap-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Stat Card component - optimized for dashboard stats
export interface StatCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  trend?: {
    value: number;
    positive?: boolean;
  };
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

const colorStyles = {
  default: 'text-foreground',
  primary: 'text-primary-hover',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'default',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('group', className)} hover>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className="text-foreground-subtle group-hover:text-foreground-muted transition-colors">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn('text-2xl font-semibold tabular-nums', colorStyles[color])}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              trend.positive ? 'text-success' : 'text-error'
            )}
          >
            {trend.positive ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </Card>
  );
}
