import { v4 as uuidv4 } from 'uuid';
import {
  ProposedIssue,
  CreateProposalInput,
  UpdateProposalInput,
  Status,
  Category,
  Severity,
} from '@/types/proposal';

// In-memory store (works on Vercel serverless)
// Data persists within a serverless instance but resets on cold start
const globalStore = globalThis as typeof globalThis & {
  proposalsStore?: Map<string, ProposedIssue>;
  filesScanned?: number;
};

function getStore(): Map<string, ProposedIssue> {
  if (!globalStore.proposalsStore) {
    globalStore.proposalsStore = new Map();
  }
  return globalStore.proposalsStore;
}

export function setFilesScanned(count: number): void {
  globalStore.filesScanned = count;
}

export function getFilesScanned(): number {
  return globalStore.filesScanned || 0;
}

export function createProposal(input: CreateProposalInput): ProposedIssue {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();

  const proposal: ProposedIssue = {
    id,
    title: input.title,
    description: input.description,
    category: input.category,
    severity: input.severity,
    filePath: input.filePath,
    lineNumbers: input.lineNumbers,
    codeSnippet: input.codeSnippet,
    suggestedFix: input.suggestedFix,
    rationale: input.rationale,
    status: input.isPreExisting ? 'approved' : 'pending', // Pre-existing issues are auto-approved (already in Linear)
    createdAt: now,
    updatedAt: now,
    isPreExisting: input.isPreExisting,
    existingLinearIssueId: input.existingLinearIssueId,
    existingLinearIssueUrl: input.existingLinearIssueUrl,
  };

  store.set(id, proposal);
  return proposal;
}

export function getProposalById(id: string): ProposedIssue | null {
  const store = getStore();
  return store.get(id) || null;
}

export function getAllProposals(filters?: {
  status?: Status | Status[];
  category?: Category;
  severity?: Severity;
}): ProposedIssue[] {
  const store = getStore();
  let proposals = Array.from(store.values());

  // Unsnooze expired items
  const now = new Date().toISOString();
  proposals.forEach(p => {
    if (p.status === 'snoozed' && (p as ProposedIssue & { snoozedUntil?: string }).snoozedUntil && (p as ProposedIssue & { snoozedUntil?: string }).snoozedUntil! < now) {
      p.status = 'pending';
      (p as ProposedIssue & { snoozedUntil?: string }).snoozedUntil = undefined;
      p.updatedAt = now;
    }
  });

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    proposals = proposals.filter(p => statuses.includes(p.status));
  }

  if (filters?.category) {
    proposals = proposals.filter(p => p.category === filters.category);
  }

  if (filters?.severity) {
    proposals = proposals.filter(p => p.severity === filters.severity);
  }

  // Sort by severity (critical first) then by date
  const severityOrder: Record<Severity, number> = { critical: 1, high: 2, medium: 3, low: 4 };
  proposals.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return proposals;
}

export function updateProposal(input: UpdateProposalInput): ProposedIssue | null {
  const store = getStore();
  const proposal = store.get(input.id);
  if (!proposal) return null;

  const now = new Date().toISOString();

  if (input.status !== undefined) proposal.status = input.status;
  if (input.title !== undefined) proposal.title = input.title;
  if (input.description !== undefined) proposal.description = input.description;
  if (input.linearIssueId !== undefined) proposal.linearIssueId = input.linearIssueId;
  if (input.linearIssueUrl !== undefined) proposal.linearIssueUrl = input.linearIssueUrl;
  proposal.updatedAt = now;

  store.set(input.id, proposal);
  return proposal;
}

export function snoozeProposal(id: string, days: number): ProposedIssue | null {
  const store = getStore();
  const proposal = store.get(id);
  if (!proposal) return null;

  const now = new Date();
  const snoozedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  proposal.status = 'snoozed';
  (proposal as ProposedIssue & { snoozedUntil?: string }).snoozedUntil = snoozedUntil;
  proposal.updatedAt = now.toISOString();

  store.set(id, proposal);
  return proposal;
}

export function deleteProposal(id: string): boolean {
  const store = getStore();
  return store.delete(id);
}

export function clearAllProposals(): void {
  const store = getStore();
  store.clear();
}

export function getProposalStats(): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  snoozed: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<Category, number>;
} {
  const store = getStore();
  const proposals = Array.from(store.values());

  const total = proposals.length;
  const pending = proposals.filter(p => p.status === 'pending').length;
  const approved = proposals.filter(p => p.status === 'approved').length;
  const rejected = proposals.filter(p => p.status === 'rejected').length;
  const snoozed = proposals.filter(p => p.status === 'snoozed').length;

  const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const byCategory: Record<Category, number> = { security: 0, testing: 0 };

  proposals.forEach(p => {
    bySeverity[p.severity]++;
    byCategory[p.category]++;
  });

  return { total, pending, approved, rejected, snoozed, bySeverity, byCategory };
}

export function findSimilarProposal(filePath: string, title: string): ProposedIssue | null {
  const store = getStore();
  const proposals = Array.from(store.values());
  return proposals.find(p =>
    p.filePath === filePath && p.title === title && p.status !== 'rejected'
  ) || null;
}
