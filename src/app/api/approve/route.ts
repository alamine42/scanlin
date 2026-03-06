import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/supabase/helpers';
import { getLinearClient, getDefaultTeamId, createLinearIssue } from '@/lib/integrations/linear';
import { getProposalById, updateProposalStatus } from '@/lib/services/proposals';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspace');

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'Workspace is required' }, { status: 400 });
    }

    const body = await request.json();
    const { proposalId } = body;

    if (!proposalId) {
      return NextResponse.json(
        { error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Validate workspace access
    const access = await validateWorkspaceAccess(supabase, userId, workspaceSlug);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { workspaceId } = access;

    // Get Linear client
    const linearClient = await getLinearClient(workspaceId);
    if (!linearClient) {
      return NextResponse.json(
        { error: 'Linear not connected. Please connect your Linear account in settings.' },
        { status: 400 }
      );
    }

    // Get default team
    const teamId = await getDefaultTeamId(linearClient, workspaceId);
    if (!teamId) {
      return NextResponse.json(
        { error: 'No Linear team found. Please configure your Linear settings.' },
        { status: 400 }
      );
    }

    // Get proposal
    const proposal = await getProposalById(workspaceId, proposalId);
    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    if (proposal.status === 'approved') {
      return NextResponse.json(
        { error: 'Proposal already approved' },
        { status: 400 }
      );
    }

    // Create Linear issue
    const { issueId, issueUrl } = await createLinearIssue(linearClient, teamId, proposal);

    // Update proposal status
    await updateProposalStatus(workspaceId, proposalId, 'approved', issueId, issueUrl);

    return NextResponse.json({
      success: true,
      linearIssueId: issueId,
      linearIssueUrl: issueUrl,
    });
  } catch (error) {
    console.error('Failed to approve proposal:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Linear issue' },
      { status: 500 }
    );
  }
}
