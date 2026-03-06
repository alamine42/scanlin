import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { ProposalDetail } from '@/components/ProposalDetail';
import type { ProposedIssue, Severity, Category } from '@/types/proposal';
import type { Proposal } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ workspaceSlug: string; id: string }>;
}

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

interface ProposalPageData {
  proposal: Proposal;
}

async function getProposalData(
  userId: string,
  workspaceSlug: string,
  proposalId: string
): Promise<ProposalPageData | null> {
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

  // Check membership
  const membershipQuery = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userData.id)
    .single();
  if (membershipQuery.error || !membershipQuery.data) {
    return null;
  }

  // Get proposal
  const proposalQuery = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('workspace_id', workspaceId)
    .single();
  const proposal = proposalQuery.data as Proposal | null;
  if (proposalQuery.error || !proposal) {
    return null;
  }

  return { proposal };
}

export default async function ProposalPage({ params }: PageProps) {
  const { workspaceSlug, id } = await params;
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const data = await getProposalData(userId, workspaceSlug, id);

  if (!data) {
    notFound();
  }

  const clientProposal = toClientProposal(data.proposal);

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/${workspaceSlug}`}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all proposals
      </Link>

      {/* Detail view */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <ProposalDetail proposal={clientProposal} workspaceSlug={workspaceSlug} />
      </div>
    </div>
  );
}
