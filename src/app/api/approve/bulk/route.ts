import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/supabase/helpers';
import { getLinearClient, getDefaultTeamId, createLinearIssue } from '@/lib/integrations/linear';
import { getPendingProposalsBySeverity, updateProposalStatus } from '@/lib/services/proposals';
import type { Severity } from '@/types/database';

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
    const { minSeverity, proposalIds } = body as {
      minSeverity?: Severity | 'all';
      proposalIds?: string[];
    };

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

    // Get eligible proposals - either by IDs or by severity
    let proposals;
    if (proposalIds && proposalIds.length > 0) {
      // Fetch specific proposals by ID
      const result = await supabase
        .from('proposals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .in('id', proposalIds);

      proposals = (result.data || []) as Awaited<ReturnType<typeof getPendingProposalsBySeverity>>;
    } else if (minSeverity) {
      proposals = await getPendingProposalsBySeverity(workspaceId, minSeverity);
    } else {
      return NextResponse.json({ error: 'Either minSeverity or proposalIds is required' }, { status: 400 });
    }

    if (proposals.length === 0) {
      return NextResponse.json({
        success: true,
        approved: 0,
        failed: 0,
        message: 'No proposals match the criteria',
      });
    }

    // Approve each proposal
    const results: { id: string; title: string; linearUrl?: string; error?: string }[] = [];

    for (const proposal of proposals) {
      try {
        const { issueId, issueUrl } = await createLinearIssue(linearClient, teamId, proposal);
        await updateProposalStatus(workspaceId, proposal.id, 'approved', issueId, issueUrl);
        results.push({ id: proposal.id, title: proposal.title, linearUrl: issueUrl });
      } catch (error) {
        results.push({
          id: proposal.id,
          title: proposal.title,
          error: error instanceof Error ? error.message : 'Failed to create issue',
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const approved = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;

    return NextResponse.json({
      success: true,
      approved,
      failed,
      results,
    });
  } catch (error) {
    console.error('Bulk approve error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk approve failed' },
      { status: 500 }
    );
  }
}
