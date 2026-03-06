import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { ProposalList } from '@/components/ProposalList';
import { ScanButton } from '@/components/ScanButton';
import { StatCard, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ProposedIssue, Severity, Category } from '@/types/proposal';
import type { Proposal } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ repository?: string }>;
}

// Convert database proposal to client-side format
function toClientProposal(proposal: Proposal): ProposedIssue {
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description,
    category: proposal.category as Category,
    severity: proposal.severity as Severity,
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

interface DashboardData {
  workspaceId: string;
  proposals: Proposal[];
  filesScanned: number;
  hasGitHubConnection: boolean;
}

async function getDashboardData(userId: string, workspaceSlug: string): Promise<DashboardData | null> {
  const supabase = await createClient();

  // Get user
  const userQuery = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  const userData = userQuery.data as { id: string } | null;
  if (userQuery.error || !userData) {
    return null;
  }

  // Get workspace
  const workspaceQuery = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .single();

  const workspaceData = workspaceQuery.data as { id: string } | null;
  if (workspaceQuery.error || !workspaceData) {
    return null;
  }

  const workspaceId = workspaceData.id;

  // SECURITY: Verify user is a member of this workspace
  const membershipQuery = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userData.id)
    .single();

  if (membershipQuery.error || !membershipQuery.data) {
    // User is not a member of this workspace - deny access
    return null;
  }

  // Get proposals
  const proposalsQuery = await supabase
    .from('proposals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  const proposals = (proposalsQuery.data || []) as Proposal[];

  // Get latest scan info
  const scanQuery = await supabase
    .from('scans')
    .select('files_scanned')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  const filesScanned = (scanQuery.data as { files_scanned: number } | null)?.files_scanned || 0;

  // Check GitHub connection
  const githubQuery = await supabase
    .from('github_connections')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .single();
  const hasGitHubConnection = !!githubQuery.data;

  return {
    workspaceId,
    proposals,
    filesScanned,
    hasGitHubConnection,
  };
}

export default async function WorkspaceDashboardPage({ params, searchParams }: PageProps) {
  const { userId } = await auth();
  const { workspaceSlug } = await params;
  const { repository: repositoryFilter } = await searchParams;

  if (!userId) {
    notFound();
  }

  const data = await getDashboardData(userId, workspaceSlug);

  if (!data) {
    notFound();
  }

  // Filter proposals by repository if filter is provided
  let filteredProposals = data.proposals;
  if (repositoryFilter) {
    filteredProposals = data.proposals.filter(p => p.repository_id === repositoryFilter);
  }

  const clientProposals = filteredProposals.map(toClientProposal);

  // Calculate stats
  const stats = {
    total: clientProposals.length,
    pending: clientProposals.filter(p => p.status === 'pending').length,
    approved: clientProposals.filter(p => p.status === 'approved').length,
    rejected: clientProposals.filter(p => p.status === 'rejected').length,
    snoozed: clientProposals.filter(p => p.status === 'snoozed').length,
    bySeverity: {
      critical: clientProposals.filter(p => p.severity === 'critical').length,
      high: clientProposals.filter(p => p.severity === 'high').length,
      medium: clientProposals.filter(p => p.severity === 'medium').length,
      low: clientProposals.filter(p => p.severity === 'low').length,
    },
    byCategory: {
      security: clientProposals.filter(p => p.category === 'security').length,
      testing: clientProposals.filter(p => p.category === 'testing').length,
    },
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Proposed Issues</h1>
          <p className="text-sm text-foreground-muted">
            AI-detected security vulnerabilities and testing gaps
          </p>
        </div>
        <ScanButton
          hasProposals={clientProposals.length > 0}
          disabled={!data.hasGitHubConnection}
          workspaceSlug={workspaceSlug}
        />
      </header>

      {/* Setup prompt if no integrations */}
      {!data.hasGitHubConnection && (
        <Card className="border-primary/20 bg-primary-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground">Connect GitHub to get started</h3>
              <p className="mt-0.5 text-sm text-foreground-muted">
                Connect your GitHub account to scan repositories for security vulnerabilities and testing gaps.
              </p>
            </div>
            <Link href={`/${workspaceSlug}/settings/integrations`}>
              <Button
                variant="primary"
                size="sm"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                }
                iconPosition="right"
                className="flex-shrink-0"
              >
                Connect
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <StatCard
            label="Files Scanned"
            value={data.filesScanned}
            color="primary"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Total Issues"
            value={stats.total}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Security"
            value={stats.byCategory.security}
            color="error"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
          <StatCard
            label="Testing"
            value={stats.byCategory.testing}
            color="default"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
          />
          <StatCard
            label="Critical"
            value={stats.bySeverity.critical}
            color="error"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Empty state */}
      {clientProposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-surface flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-foreground-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-foreground mb-2">No proposed issues yet</h2>
          <p className="text-sm text-foreground-muted max-w-md mx-auto mb-6">
            {data.hasGitHubConnection
              ? 'Run a scan to analyze your repository for security vulnerabilities and testing gaps. AI will identify potential issues that need your review.'
              : 'Connect your GitHub account to start scanning repositories.'}
          </p>
          {data.hasGitHubConnection && (
            <ScanButton
              hasProposals={false}
              disabled={false}
              workspaceSlug={workspaceSlug}
            />
          )}
        </div>
      ) : (
        <ProposalList proposals={clientProposals} workspaceSlug={workspaceSlug} />
      )}
    </div>
  );
}
