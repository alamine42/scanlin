'use client';

import { Severity } from '@/types/proposal';

interface SeverityIndicatorProps {
  severity: Severity;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const severityConfig: Record<Severity, { label: string; className: string; dotColor: string }> = {
  critical: {
    label: 'Critical',
    className: 'text-red-500',
    dotColor: 'bg-red-500',
  },
  high: {
    label: 'High',
    className: 'text-orange-500',
    dotColor: 'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    className: 'text-yellow-500',
    dotColor: 'bg-yellow-500',
  },
  low: {
    label: 'Low',
    className: 'text-blue-500',
    dotColor: 'bg-blue-500',
  },
};

export function SeverityIndicator({ severity, showLabel = true, size = 'md' }: SeverityIndicatorProps) {
  const config = severityConfig[severity];
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-2 ${config.className}`}>
      <span className={`${dotSize} ${config.dotColor} rounded-full`} />
      {showLabel && <span className={`font-medium ${textSize}`}>{config.label}</span>}
    </span>
  );
}
