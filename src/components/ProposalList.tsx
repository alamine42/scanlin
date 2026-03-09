'use client';

import { useState, useRef, useEffect } from 'react';
import { ProposedIssue, Category, Severity } from '@/types/proposal';
import { ProposalCard } from './ProposalCard';
import { BulkActions } from './BulkActions';
import { Select } from './ui/select';
import { cn } from '@/lib/utils';

interface ProposalListProps {
  proposals: ProposedIssue[];
  workspaceSlug?: string;
}

export function ProposalList({ proposals, workspaceSlug }: ProposalListProps) {
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Separate pre-existing issues from new proposals
  const newProposals = proposals.filter(p => !p.isPreExisting);
  const preExistingIssues = proposals.filter(p => p.isPreExisting);

  // Only show pending proposals (other statuses are accessed via other views)
  const pendingNewProposals = newProposals.filter(p => p.status === 'pending');

  const filteredProposals = pendingNewProposals.filter(proposal => {
    if (categoryFilter !== 'all' && proposal.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && proposal.severity !== severityFilter) return false;
    return true;
  });

  const filteredPreExisting = preExistingIssues.filter(proposal => {
    if (categoryFilter !== 'all' && proposal.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && proposal.severity !== severityFilter) return false;
    return true;
  });

  // Calculate pending counts by severity for bulk actions
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

  // Select All logic
  const selectAllRef = useRef<HTMLInputElement>(null);
  const filteredIds = filteredProposals.map(p => p.id);
  const selectedInFiltered = filteredIds.filter(id => selectedIds.has(id));
  const allSelected = filteredIds.length > 0 && selectedInFiltered.length === filteredIds.length;
  const someSelected = selectedInFiltered.length > 0 && selectedInFiltered.length < filteredIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Bulk actions */}
        <div className="flex-1">
          <BulkActions
            counts={pendingCounts}
            workspaceSlug={workspaceSlug}
            selectedIds={validSelectedIds}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-3">
          {/* Category filter */}
          <Select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as Category | 'all')}
            className="w-[160px]"
          >
            <option value="all">All Categories</option>
            <option value="security">Security</option>
            <option value="testing">Testing</option>
            <option value="tech_debt">Tech Debt</option>
            <option value="performance">Performance</option>
            <option value="documentation">Documentation</option>
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
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-3 px-4 py-2 bg-surface/50 rounded-lg border border-border/50">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-foreground-muted">
              {allSelected
                ? `All ${filteredIds.length} selected`
                : someSelected
                ? `${selectedInFiltered.length} of ${filteredIds.length} selected`
                : `Select all ${filteredIds.length} issues`}
            </span>
          </div>

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
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-base font-medium text-foreground-muted">
                Already in Linear
              </h2>
              <span className="text-xs text-foreground-subtle px-2 py-0.5 bg-surface rounded-full">
                {filteredPreExisting.length} issue{filteredPreExisting.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-foreground-subtle">
              These issues already exist in Linear. Click to view details or create a new issue anyway.
            </p>
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
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
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
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">No pending proposals</h3>
      <p className="text-xs text-foreground-subtle max-w-xs">Run a scan to find issues in your codebase</p>
    </div>
  );
}
