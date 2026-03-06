'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Context for tabs state
interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs');
  }
  return context;
}

// Main Tabs component
export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;

  const setActiveTab = (tab: string) => {
    setInternalValue(tab);
    onValueChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// TabsList component
export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1',
        'bg-background-subtle rounded-lg',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

// TabsTrigger component
export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  badge?: number | string;
}

export function TabsTrigger({
  value,
  children,
  className,
  disabled,
  badge,
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'px-3 py-1.5 text-sm font-medium rounded-md',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-subtle',
        // Touch target for mobile
        'min-h-[36px] md:min-h-0',
        isActive
          ? 'bg-surface text-foreground shadow-sm'
          : 'text-foreground-muted hover:text-foreground hover:bg-surface/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded-full',
            isActive
              ? 'bg-primary-muted text-primary-hover'
              : 'bg-background-muted text-foreground-subtle'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// TabsContent component
export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <div
      id={`tabpanel-${value}`}
      role="tabpanel"
      tabIndex={0}
      className={cn('animate-fade-in', className)}
    >
      {children}
    </div>
  );
}

// Status Tabs - preset for status filtering (pending, approved, rejected, snoozed)
export interface StatusTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    snoozed: number;
  };
  className?: string;
}

export function StatusTabs({
  value,
  onValueChange,
  counts,
  className,
}: StatusTabsProps) {
  const tabs = [
    { value: 'pending', label: 'Pending', count: counts.pending },
    { value: 'approved', label: 'Approved', count: counts.approved },
    { value: 'rejected', label: 'Rejected', count: counts.rejected },
    { value: 'snoozed', label: 'Snoozed', count: counts.snoozed },
  ];

  return (
    <Tabs defaultValue={value} value={value} onValueChange={onValueChange} className={className}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} badge={tab.count}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
