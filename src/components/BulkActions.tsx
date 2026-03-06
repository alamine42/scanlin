'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Severity } from '@/types/proposal';

interface BulkActionsProps {
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

type ApprovalOption = {
  label: string;
  value: Severity | 'all';
  description: string;
  count: number;
};

export function BulkActions({ counts }: BulkActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [result, setResult] = useState<{ approved: number; failed: number } | null>(null);

  const options: ApprovalOption[] = [
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

  const handleApprove = async (minSeverity: Severity | 'all') => {
    const option = options.find(o => o.value === minSeverity);
    if (!option || option.count === 0) return;

    const confirmed = confirm(
      `This will create ${option.count} Linear issue${option.count !== 1 ? 's' : ''}. Continue?`
    );
    if (!confirmed) return;

    setIsApproving(true);
    setResult(null);

    try {
      const response = await fetch('/api/approve/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minSeverity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk approve failed');
      }

      setResult({ approved: data.approved, failed: data.failed });
      setIsOpen(false);
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
        onClick={() => setIsOpen(!isOpen)}
        disabled={isApproving}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isApproving ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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
            Approving...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Bulk Approve
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && !isApproving && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
            <div className="p-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleApprove(option.value)}
                  disabled={option.count === 0}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{option.label}</span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                      {option.count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="absolute right-0 mt-2 text-sm text-green-400">
          Approved {result.approved} issue{result.approved !== 1 ? 's' : ''}
          {result.failed > 0 && (
            <span className="text-red-400 ml-2">
              ({result.failed} failed)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
