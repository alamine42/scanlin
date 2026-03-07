'use client';

import { useState } from 'react';
import { ProposedIssue, Category, Severity, Status } from '@/types/proposal';
import { ProposalCard } from './ProposalCard';
import { BulkActions } from './BulkActions';
import { StatusTabs } from './ui/tabs';
import { Select } from './ui/select';
import { cn } from '@/lib/utils';

interface ProposalListProps {
  proposals: ProposedIssue[];
  workspaceSlug?: string;
}

export function ProposalList({ proposals, workspaceSlug }: ProposalListProps) {
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Selection handlers
  const handleSelectChange = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Filter selectedIds to only include pending proposals that are currently visible
  const validSelectedIds = Array.from(selectedIds).filter(id =>
    pendingProposals.some(p => p.id === id)
  );

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Status tabs with bulk action */}
        <div className="flex-1 overflow-x-auto overflow-y-visible -mx-4 px-4 sm:mx-0 sm:px-0">
          <StatusTabs
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as Status)}
            counts={counts}
            leftAction={
              <BulkActions
                counts={pendingCounts}
                workspaceSlug={workspaceSlug}
                selectedIds={validSelectedIds}
                onClearSelection={() => setSelectedIds(new Set())}
              />
            }
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-3">
          {/* Category filter */}
          <Select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as Category | 'all')}
            className="w-[140px]"
          >
            <option value="all">All Categories</option>
            <option value="security">Security</option>
            <option value="testing">Testing</option>
          </Select>

          {/* Severity filter */}
          <Select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as Severity | 'all')}
            className="w-[130px]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>
      </div>

      {/* New Proposals */}
      {filteredProposals.length === 0 ? (
        <EmptyState statusFilter={statusFilter} />
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((proposal, index) => (
            <div
              key={proposal.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProposalCard
                proposal={proposal}
                workspaceSlug={workspaceSlug}
                selectable={proposal.status === 'pending'}
                selected={selectedIds.has(proposal.id)}
                onSelectChange={handleSelectChange}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pre-Existing Issues Section */}
      {filteredPreExisting.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-medium text-foreground-muted">
              Pre-Existing Issues
            </h2>
            <span className="text-xs text-foreground-subtle px-2 py-0.5 bg-surface rounded-full">
              {filteredPreExisting.length} tracked
            </span>
          </div>
          <div className="border-t border-border pt-4">
            <div className="space-y-3">
              {filteredPreExisting.map((proposal, index) => (
                <div
                  key={proposal.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProposalCard
                    proposal={proposal}
                    isPreExisting
                    workspaceSlug={workspaceSlug}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ statusFilter }: { statusFilter: string }) {
  const messages = {
    pending: {
      title: 'No pending proposals',
      description: 'Run a scan to find issues in your codebase',
      icon: (
        <svg
          className="w-8 h-8 text-foreground-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
    approved: {
      title: 'No approved proposals',
      description: 'Approved issues will appear here once you review them',
      icon: (
        <svg
          className="w-8 h-8 text-foreground-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    rejected: {
      title: 'No rejected proposals',
      description: 'Rejected proposals will be shown here',
      icon: (
        <svg
          className="w-8 h-8 text-foreground-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    snoozed: {
      title: 'No snoozed proposals',
      description: 'Snoozed issues will reappear when their timer expires',
      icon: (
        <svg
          className="w-8 h-8 text-foreground-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    all: {
      title: 'No proposals found',
      description: 'Try adjusting your filters',
      icon: (
        <svg
          className="w-8 h-8 text-foreground-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
  };

  const content = messages[statusFilter as keyof typeof messages] || messages.all;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
        {content.icon}
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">{content.title}</h3>
      <p className="text-xs text-foreground-subtle max-w-xs">{content.description}</p>
    </div>
  );
}
