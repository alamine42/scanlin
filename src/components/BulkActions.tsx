'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Severity } from '@/types/proposal';
import { cn } from '@/lib/utils';

interface BulkActionsProps {
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  workspaceSlug?: string;
  selectedIds?: string[];
  onClearSelection?: () => void;
}

type ApprovalOption = {
  label: string;
  value: Severity | 'all' | 'selected';
  description: string;
  count: number;
};

export function BulkActions({ counts, workspaceSlug, selectedIds = [], onClearSelection }: BulkActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [result, setResult] = useState<{ approved: number; failed: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const hasSelection = selectedIds.length > 0;

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen]);

  const options: ApprovalOption[] = [
    ...(hasSelection ? [{
      label: 'Approve Selected',
      value: 'selected' as const,
      description: `Approve ${selectedIds.length} selected proposal${selectedIds.length !== 1 ? 's' : ''}`,
      count: selectedIds.length,
    }] : []),
    {
      label: 'Approve All',
      value: 'all',
      description: 'Create Linear issues for all pending proposals',
      count: counts.total,
    },
    {
      label: 'Approve Critical',
      value: 'critical',
      description: 'Only critical severity',
      count: counts.critical,
    },
    {
      label: 'Approve High+',
      value: 'high',
      description: 'Critical and high severity',
      count: counts.critical + counts.high,
    },
    {
      label: 'Approve Medium+',
      value: 'medium',
      description: 'Critical, high, and medium severity',
      count: counts.critical + counts.high + counts.medium,
    },
  ];

  const handleApprove = async (minSeverity: Severity | 'all' | 'selected') => {
    const option = options.find(o => o.value === minSeverity);
    if (!option || option.count === 0) return;

    const confirmed = confirm(
      `This will create ${option.count} Linear issue${option.count !== 1 ? 's' : ''}. Continue?`
    );
    if (!confirmed) return;

    setIsApproving(true);
    setResult(null);

    try {
      const url = workspaceSlug ? `/api/approve/bulk?workspace=${workspaceSlug}` : '/api/approve/bulk';
      const body = minSeverity === 'selected'
        ? { proposalIds: selectedIds }
        : { minSeverity };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk approve failed');
      }

      setResult({ approved: data.approved, failed: data.failed });
      setIsOpen(false);
      onClearSelection?.();
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Bulk approve failed');
    } finally {
      setIsApproving(false);
    }
  };

  if (counts.total === 0) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isApproving}
        className={cn(
          'inline-flex items-center justify-center gap-1.5',
          'px-3 py-1.5 text-sm font-medium rounded-md',
          'transition-all duration-150',
          'min-h-[36px] md:min-h-0',
          'bg-success/20 text-success hover:bg-success/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 focus-visible:ring-offset-background-subtle',
          isApproving && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isApproving ? (
          <>
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Approving...</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{hasSelection ? `Approve (${selectedIds.length})` : 'Bulk Approve'}</span>
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && !isApproving && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="fixed w-64 bg-surface border border-border rounded-lg shadow-xl z-50 animate-fade-in"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            <div className="p-1.5">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleApprove(option.value)}
                  disabled={option.count === 0}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-background-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{option.label}</span>
                    <span className="text-xs bg-background-muted text-foreground-muted px-2 py-0.5 rounded-full">
                      {option.count}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-subtle mt-0.5">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      {result && (
        <div className="absolute left-0 mt-2 text-sm text-success whitespace-nowrap">
          Approved {result.approved} issue{result.approved !== 1 ? 's' : ''}
          {result.failed > 0 && (
            <span className="text-error ml-2">
              ({result.failed} failed)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
