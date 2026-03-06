import { NextRequest, NextResponse } from 'next/server';
import { getProposalById } from '@/lib/db';
import { createLinearIssue } from '@/lib/linear';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposalId } = body;

    if (!proposalId) {
      return NextResponse.json(
        { error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.LINEAR_API_KEY) {
      return NextResponse.json(
        { error: 'LINEAR_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    if (!process.env.LINEAR_TEAM_ID) {
      return NextResponse.json(
        { error: 'LINEAR_TEAM_ID environment variable is not set' },
        { status: 500 }
      );
    }

    const proposal = getProposalById(proposalId);
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

    const { issueId, issueUrl } = await createLinearIssue(proposal);

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
