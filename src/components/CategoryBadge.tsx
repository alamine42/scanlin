'use client';

import { Category } from '@/types/proposal';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md';
}

const categoryConfig: Record<Category, { icon: string; label: string; className: string }> = {
  security: {
    icon: '🔒',
    label: 'Security',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  testing: {
    icon: '🧪',
    label: 'Testing',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  tech_debt: {
    icon: '🔧',
    label: 'Tech Debt',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  performance: {
    icon: '⚡',
    label: 'Performance',
    className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  documentation: {
    icon: '📝',
    label: 'Docs',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
};

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const config = categoryConfig[category];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.className} ${sizeClasses}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
