import { createClient } from '@/lib/supabase/server';
import type { Proposal, Category, Severity, ProposalStatus } from '@/types/database';
import type { ProposedIssue, CreateProposalInput } from '@/types/proposal';

/**
 * Convert database proposal to client-side format
 */
export function toClientProposal(proposal: Proposal): ProposedIssue {
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description,
    category: proposal.category as ProposedIssue['category'],
    severity: proposal.severity as ProposedIssue['severity'],
    filePath: proposal.file_path,
    lineNumbers: proposal.line_start && proposal.line_end
      ? { start: proposal.line_start, end: proposal.line_end }
      : undefined,
    codeSnippet: proposal.code_snippet || undefined,
    suggestedFix: proposal.suggested_fix || undefined,
    rationale: proposal.rationale,
    status: proposal.status as ProposedIssue['status'],
    createdAt: proposal.created_at,
    updatedAt: proposal.updated_at,
    linearIssueId: proposal.linear_issue_id || undefined,
    linearIssueUrl: proposal.linear_issue_url || undefined,
    isPreExisting: proposal.is_pre_existing,
    existingLinearIssueId: proposal.existing_linear_issue_id || undefined,
    existingLinearIssueUrl: proposal.existing_linear_issue_url || undefined,
  };
}

/**
 * Create a new proposal
 */
export async function createProposal(
  workspaceId: string,
  repositoryId: string,
  scanId: string | null,
  input: CreateProposalInput
): Promise<ProposedIssue | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      workspace_id: workspaceId,
      repository_id: repositoryId,
      scan_id: scanId,
      title: input.title,
      description: input.description,
      category: input.category,
      severity: input.severity,
      file_path: input.filePath,
      line_start: input.lineNumbers?.start || null,
      line_end: input.lineNumbers?.end || null,
      code_snippet: input.codeSnippet || null,
      suggested_fix: input.suggestedFix || null,
      rationale: input.rationale,
      status: input.isPreExisting ? 'approved' : 'pending',
      is_pre_existing: input.isPreExisting || false,
      existing_linear_issue_id: input.existingLinearIssueId || null,
      existing_linear_issue_url: input.existingLinearIssueUrl || null,
    } as never)
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating proposal:', error);
    return null;
  }

  return toClientProposal(data);
}

/**
 * Get all proposals for a workspace
 */
export async function getProposals(
  workspaceId: string,
  filters?: {
    status?: ProposalStatus | ProposalStatus[];
    category?: Category;
    severity?: Severity;
    repositoryId?: string;
  }
): Promise<ProposedIssue[]> {
  const supabase = await createClient();

  let query = supabase
    .from('proposals')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in('status', statuses);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }

  if (filters?.repositoryId) {
    query = query.eq('repository_id', filters.repositoryId);
  }

  // Order by severity then date
  query = query.order('created_at', { ascending: false });

  const result = await query;
  const proposals = result.data as Proposal[] | null;

  if (result.error) {
    console.error('Error fetching proposals:', result.error);
    return [];
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
  const sorted = (proposals || []).sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return sorted.map(toClientProposal);
}

/**
 * Get a single proposal by ID
 */
export async function getProposalById(
  workspaceId: string,
  proposalId: string
): Promise<ProposedIssue | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    return null;
  }

  return toClientProposal(data);
}

/**
 * Update a proposal's status
 */
export async function updateProposalStatus(
  workspaceId: string,
  proposalId: string,
  status: ProposalStatus,
  linearIssueId?: string,
  linearIssueUrl?: string
): Promise<ProposedIssue | null> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (linearIssueId) updates.linear_issue_id = linearIssueId;
  if (linearIssueUrl) updates.linear_issue_url = linearIssueUrl;

  const result = await supabase
    .from('proposals')
    .update(updates as never)
    .eq('id', proposalId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  const data = result.data as Proposal | null;

  if (result.error || !data) {
    console.error('Error updating proposal:', result.error);
    return null;
  }

  return toClientProposal(data);
}

/**
 * Snooze a proposal
 */
export async function snoozeProposal(
  workspaceId: string,
  proposalId: string,
  days: number
): Promise<ProposedIssue | null> {
  const supabase = await createClient();

  const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const result = await supabase
    .from('proposals')
    .update({
      status: 'snoozed',
      snoozed_until: snoozedUntil,
    } as never)
    .eq('id', proposalId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  const data = result.data as Proposal | null;

  if (result.error || !data) {
    console.error('Error snoozing proposal:', result.error);
    return null;
  }

  return toClientProposal(data);
}

/**
 * Find similar proposal (for deduplication)
 */
export async function findSimilarProposal(
  workspaceId: string,
  repositoryId: string,
  filePath: string,
  title: string
): Promise<ProposedIssue | null> {
  const supabase = await createClient();

  const result = await supabase
    .from('proposals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('repository_id', repositoryId)
    .eq('file_path', filePath)
    .eq('title', title)
    .neq('status', 'rejected')
    .limit(1)
    .single();

  const data = result.data as Proposal | null;

  if (result.error || !data) {
    return null;
  }

  return toClientProposal(data);
}

/**
 * Delete all proposals for a workspace (or repository)
 */
export async function clearProposals(
  workspaceId: string,
  repositoryId?: string
): Promise<void> {
  const supabase = await createClient();

  let query = supabase
    .from('proposals')
    .delete()
    .eq('workspace_id', workspaceId);

  if (repositoryId) {
    query = query.eq('repository_id', repositoryId);
  }

  await query;
}

/**
 * Get proposal statistics for a workspace
 */
export async function getProposalStats(workspaceId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  snoozed: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  const supabase = await createClient();

  const result = await supabase
    .from('proposals')
    .select('status, severity, category')
    .eq('workspace_id', workspaceId);

  const data = result.data as { status: ProposalStatus; severity: Severity; category: Category }[] | null;

  if (result.error || !data) {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      snoozed: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      byCategory: { security: 0, testing: 0 },
    };
  }

  const stats = {
    total: data.length,
    pending: data.filter(p => p.status === 'pending').length,
    approved: data.filter(p => p.status === 'approved').length,
    rejected: data.filter(p => p.status === 'rejected').length,
    snoozed: data.filter(p => p.status === 'snoozed').length,
    bySeverity: {
      critical: data.filter(p => p.severity === 'critical').length,
      high: data.filter(p => p.severity === 'high').length,
      medium: data.filter(p => p.severity === 'medium').length,
      low: data.filter(p => p.severity === 'low').length,
    },
    byCategory: {
      security: data.filter(p => p.category === 'security').length,
      testing: data.filter(p => p.category === 'testing').length,
    },
  };

  return stats;
}

/**
 * Get pending proposals by minimum severity
 */
export async function getPendingProposalsBySeverity(
  workspaceId: string,
  minSeverity: Severity | 'all'
): Promise<ProposedIssue[]> {
  const proposals = await getProposals(workspaceId, { status: 'pending' });

  if (minSeverity === 'all') {
    return proposals.filter(p => !p.isPreExisting);
  }

  const severityOrder: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
  const minLevel = severityOrder[minSeverity];

  return proposals.filter(p =>
    !p.isPreExisting && severityOrder[p.severity] <= minLevel
  );
}
