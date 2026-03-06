'use client';

import Link from 'next/link';
import { ProposedIssue } from '@/types/proposal';
import { SeverityBadge, CategoryBadge } from './ui/badge';
import { cn } from '@/lib/utils';

interface ProposalCardProps {
  proposal: ProposedIssue;
  isPreExisting?: boolean;
  workspaceSlug?: string;
}

const severityBarColors = {
  critical: 'bg-severity-critical',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
};

const statusIndicators = {
  pending: { color: 'bg-status-pending', label: 'Pending review' },
  approved: { color: 'bg-status-approved', label: 'Approved' },
  rejected: { color: 'bg-status-rejected', label: 'Rejected' },
  snoozed: { color: 'bg-status-snoozed', label: 'Snoozed' },
};

export function ProposalCard({ proposal, isPreExisting, workspaceSlug }: ProposalCardProps) {
  const proposalUrl = workspaceSlug
    ? `/${workspaceSlug}/proposals/${proposal.id}`
    : `/proposals/${proposal.id}`;

  const status = statusIndicators[proposal.status];

  return (
    <Link href={proposalUrl} className="block group">
      <article
        className={cn(
          'relative bg-surface border border-border rounded-lg overflow-hidden',
          'transition-all duration-200 ease-out',
          'hover:border-border-hover hover:bg-surface-hover',
          'hover:shadow-md hover:-translate-y-0.5',
          'active:scale-[0.99] active:translate-y-0',
          'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background'
        )}
      >
        {/* Severity indicator bar */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1',
            severityBarColors[proposal.severity]
          )}
        />

        <div className="pl-4 pr-4 py-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Status dot */}
                <span
                  className={cn('w-2 h-2 rounded-full flex-shrink-0', status.color)}
                  title={status.label}
                />
                <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary-hover transition-colors">
                  {proposal.title}
                </h3>
              </div>

              {/* File path */}
              <p className="flex items-center gap-1 text-xs text-foreground-subtle truncate">
                <svg
                  className="w-3 h-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="truncate">{proposal.filePath}</span>
                {proposal.lineNumbers && (
                  <span className="text-foreground-subtle/60 flex-shrink-0">
                    :{proposal.lineNumbers.start}-{proposal.lineNumbers.end}
                  </span>
                )}
              </p>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <SeverityBadge severity={proposal.severity} size="sm" />
              <CategoryBadge category={proposal.category} size="sm" />
            </div>
          </div>

          {/* Pre-existing issue indicator */}
          {isPreExisting && proposal.existingLinearIssueUrl && (
            <div className="mt-3 pt-3 border-t border-border">
              <a
                href={proposal.existingLinearIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-primary-hover hover:text-primary transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Already tracked in Linear
              </a>
            </div>
          )}

          {/* Newly approved issue indicator */}
          {!isPreExisting && proposal.status === 'approved' && proposal.linearIssueUrl && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="inline-flex items-center gap-1.5 text-xs text-success">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Created in Linear
              </div>
            </div>
          )}
        </div>

        {/* Hover arrow indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-4 h-4 text-foreground-subtle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </article>
    </Link>
  );
}
