'use client';

import Link from 'next/link';
import { ProposedIssue } from '@/types/proposal';
import { CategoryBadge } from './CategoryBadge';
import { SeverityIndicator } from './SeverityIndicator';

interface ProposalCardProps {
  proposal: ProposedIssue;
  isPreExisting?: boolean;
}

export function ProposalCard({ proposal, isPreExisting }: ProposalCardProps) {
  const statusColors = {
    pending: 'border-l-gray-500',
    approved: 'border-l-green-500',
    rejected: 'border-l-red-500',
    snoozed: 'border-l-yellow-500',
  };

  return (
    <Link href={`/proposals/${proposal.id}`}>
      <div
        className={`group bg-gray-900 border border-gray-800 rounded-lg p-4 hover:bg-gray-850 hover:border-gray-700 transition-all cursor-pointer border-l-4 ${statusColors[proposal.status]}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-100 group-hover:text-white truncate">
              {proposal.title}
            </h3>
            <p className="mt-1 text-xs text-gray-500 truncate">
              {proposal.filePath}
              {proposal.lineNumbers && (
                <span className="text-gray-600">
                  {' '}
                  : {proposal.lineNumbers.start}-{proposal.lineNumbers.end}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <SeverityIndicator severity={proposal.severity} size="sm" />
            <CategoryBadge category={proposal.category} size="sm" />
          </div>
        </div>

        {/* Pre-existing issue indicator */}
        {isPreExisting && proposal.existingLinearIssueUrl && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <a
              href={proposal.existingLinearIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                  clipRule="evenodd"
                />
              </svg>
              Already tracked in Linear
            </a>
          </div>
        )}

        {/* Newly approved issue indicator */}
        {!isPreExisting && proposal.status === 'approved' && proposal.linearIssueUrl && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <span className="text-xs text-green-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Created in Linear
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
