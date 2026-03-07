'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProposedIssue } from '@/types/proposal';

interface ApprovalActionsProps {
  proposal: ProposedIssue;
  workspaceSlug?: string;
}

export function ApprovalActions({ proposal, workspaceSlug }: ApprovalActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleApproveClick = () => {
    if (proposal.isPreExisting && proposal.existingLinearIssueUrl) {
      setShowDuplicateWarning(true);
    } else {
      handleApprove();
    }
  };

  const handleApprove = async () => {
    setShowDuplicateWarning(false);
    setIsLoading('approve');
    setError(null);

    try {
      const url = workspaceSlug ? `/api/approve?workspace=${workspaceSlug}` : '/api/approve';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setIsLoading(null);
    }
  };

  const handleReject = async () => {
    setIsLoading('reject');
    setError(null);

    try {
      const url = workspaceSlug ? `/api/proposals?workspace=${workspaceSlug}` : '/api/proposals';
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposal.id, status: 'rejected' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setIsLoading(null);
    }
  };

  const handleSnooze = async (days: number) => {
    setIsLoading('snooze');
    setError(null);
    setShowSnoozeOptions(false);

    try {
      const url = workspaceSlug ? `/api/proposals?workspace=${workspaceSlug}` : '/api/proposals';
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposal.id, snooze: days }),
      });

      if (!response.ok) {
        throw new Error('Failed to snooze');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to snooze');
    } finally {
      setIsLoading(null);
    }
  };

  if (proposal.status === 'approved') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-green-500 text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Approved
        </span>
        {proposal.linearIssueUrl && (
          <a
            href={proposal.linearIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
          >
            View in Linear
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    );
  }

  if (proposal.status === 'rejected') {
    return (
      <span className="text-red-500 text-sm font-medium flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        Rejected
      </span>
    );
  }

  if (proposal.status === 'snoozed') {
    return (
      <span className="text-yellow-500 text-sm font-medium flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
        Snoozed
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Duplicate Warning Dialog */}
      {showDuplicateWarning && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground">Duplicate Issue Warning</h4>
              <p className="text-sm text-foreground-muted mt-1">
                This issue already exists in Linear. Creating a new issue will result in a duplicate.
              </p>
              {proposal.existingLinearIssueUrl && (
                <a
                  href={proposal.existingLinearIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary-hover hover:text-primary mt-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View existing issue in Linear
                </a>
              )}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleApprove}
                  disabled={isLoading !== null}
                  className="flex items-center gap-2 px-3 py-1.5 bg-warning/20 hover:bg-warning/30 text-warning text-sm font-medium rounded-md transition-colors"
                >
                  Create Anyway
                </button>
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-surface-hover text-foreground-muted text-sm font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleApproveClick}
          disabled={isLoading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isLoading === 'approve' ? (
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
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          Approve & Create Issue
        </button>

        <button
          onClick={handleReject}
          disabled={isLoading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 text-gray-300 text-sm font-medium rounded-lg transition-colors"
        >
          {isLoading === 'reject' ? (
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
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          Reject
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
            disabled={isLoading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Snooze
          </button>

          {showSnoozeOptions && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-10">
              {[1, 7, 30].map(days => (
                <button
                  key={days}
                  onClick={() => handleSnooze(days)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  {days === 1 ? '1 day' : `${days} days`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
