'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'security' | 'testing';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
}

const variantStyles = {
  default: 'bg-surface text-foreground-muted border border-border',
  primary: 'bg-primary-muted text-primary-hover border border-primary/20',
  success: 'bg-success-muted text-success border border-success/20',
  warning: 'bg-warning-muted text-warning border border-warning/20',
  error: 'bg-error-muted text-error border border-error/20',
  security: 'bg-category-security-bg text-category-security border border-category-security/20',
  testing: 'bg-category-testing-bg text-category-testing border border-category-testing/20',
};

const sizeStyles = {
  sm: 'text-2xs px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Severity badges with preset styling
export interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

const severityConfig = {
  critical: {
    label: 'Critical',
    dotClass: 'bg-severity-critical',
    badgeClass: 'bg-severity-critical-bg text-severity-critical border border-severity-critical/20',
  },
  high: {
    label: 'High',
    dotClass: 'bg-severity-high',
    badgeClass: 'bg-severity-high-bg text-severity-high border border-severity-high/20',
  },
  medium: {
    label: 'Medium',
    dotClass: 'bg-severity-medium',
    badgeClass: 'bg-severity-medium-bg text-severity-medium border border-severity-medium/20',
  },
  low: {
    label: 'Low',
    dotClass: 'bg-severity-low',
    badgeClass: 'bg-severity-low-bg text-severity-low border border-severity-low/20',
  },
};

export function SeverityBadge({
  severity,
  size = 'md',
  showDot = true,
  className,
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        config.badgeClass,
        sizeStyles[size],
        className
      )}
    >
      {showDot && (
        <span className={cn('rounded-full flex-shrink-0', dotSize, config.dotClass)} />
      )}
      {config.label}
    </span>
  );
}

// Category badges with icons
export interface CategoryBadgeProps {
  category: 'security' | 'testing';
  size?: 'sm' | 'md';
  className?: string;
}

const categoryConfig = {
  security: {
    label: 'Security',
    icon: '🔒',
    badgeClass: 'bg-category-security-bg text-category-security border border-category-security/20',
  },
  testing: {
    label: 'Testing',
    icon: '🧪',
    badgeClass: 'bg-category-testing-bg text-category-testing border border-category-testing/20',
  },
};

export function CategoryBadge({
  category,
  size = 'md',
  className,
}: CategoryBadgeProps) {
  const config = categoryConfig[category];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        config.badgeClass,
        sizeStyles[size],
        className
      )}
    >
      <span className="flex-shrink-0">{config.icon}</span>
      {config.label}
    </span>
  );
}

// Status badge
export interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'snoozed';
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    dotClass: 'bg-status-pending',
    badgeClass: 'bg-surface text-foreground-muted border border-border',
  },
  approved: {
    label: 'Approved',
    dotClass: 'bg-status-approved',
    badgeClass: 'bg-success-muted text-success border border-success/20',
  },
  rejected: {
    label: 'Rejected',
    dotClass: 'bg-status-rejected',
    badgeClass: 'bg-error-muted text-error border border-error/20',
  },
  snoozed: {
    label: 'Snoozed',
    dotClass: 'bg-status-snoozed',
    badgeClass: 'bg-warning-muted text-warning border border-warning/20',
  },
};

export function StatusBadge({
  status,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        config.badgeClass,
        sizeStyles[size],
        className
      )}
    >
      <span className={cn('rounded-full flex-shrink-0', dotSize, config.dotClass)} />
      {config.label}
    </span>
  );
}
