'use client';

import { useState } from 'react';
import { ProposedIssue, Category, Severity, Status } from '@/types/proposal';
import { ProposalCard } from './ProposalCard';
import { BulkActions } from './BulkActions';

interface ProposalListProps {
  proposals: ProposedIssue[];
}

export function ProposalList({ proposals }: ProposalListProps) {
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('pending');

  // Separate pre-existing issues from new proposals
  const newProposals = proposals.filter(p => !p.isPreExisting);
  const preExistingIssues = proposals.filter(p => p.isPreExisting);

  const filteredProposals = newProposals.filter(proposal => {
    if (categoryFilter !== 'all' && proposal.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && proposal.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && proposal.status !== statusFilter) return false;
    return true;
  });

  const filteredPreExisting = preExistingIssues.filter(proposal => {
    if (categoryFilter !== 'all' && proposal.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && proposal.severity !== severityFilter) return false;
    return true;
  });

  const counts = {
    pending: newProposals.filter(p => p.status === 'pending').length,
    approved: newProposals.filter(p => p.status === 'approved').length,
    rejected: newProposals.filter(p => p.status === 'rejected').length,
    snoozed: newProposals.filter(p => p.status === 'snoozed').length,
  };

  // Calculate pending counts by severity for bulk actions (only new proposals)
  const pendingProposals = newProposals.filter(p => p.status === 'pending');
  const pendingCounts = {
    critical: pendingProposals.filter(p => p.severity === 'critical').length,
    high: pendingProposals.filter(p => p.severity === 'high').length,
    medium: pendingProposals.filter(p => p.severity === 'medium').length,
    low: pendingProposals.filter(p => p.severity === 'low').length,
    total: pendingProposals.length,
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Bulk Actions */}
        <BulkActions counts={pendingCounts} />

        {/* Status tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(['pending', 'approved', 'rejected', 'snoozed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1.5 text-xs text-gray-500">({counts[status]})</span>
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as Category | 'all')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="security">Security</option>
          <option value="testing">Testing</option>
        </select>

        {/* Severity filter */}
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as Severity | 'all')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* New Proposals */}
      {filteredProposals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-sm">No proposals found</div>
          <div className="text-gray-600 text-xs mt-1">
            {statusFilter === 'pending'
              ? 'Run a scan to find issues in your codebase'
              : 'Try adjusting your filters'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}

      {/* Pre-Existing Issues Section */}
      {filteredPreExisting.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-medium text-gray-400">Pre-Existing Issues</h2>
            <span className="text-sm text-gray-500">
              ({filteredPreExisting.length} already tracked in Linear)
            </span>
          </div>
          <div className="border-t border-gray-800 pt-4">
            <div className="space-y-3">
              {filteredPreExisting.map(proposal => (
                <ProposalCard key={proposal.id} proposal={proposal} isPreExisting />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
