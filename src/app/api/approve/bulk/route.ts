import { NextRequest, NextResponse } from 'next/server';
import { getAllProposals } from '@/lib/db';
import { createLinearIssue } from '@/lib/linear';
import { Severity } from '@/types/proposal';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minSeverity } = body as { minSeverity: Severity | 'all' };

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

    // Get all pending proposals
    const proposals = getAllProposals({ status: 'pending' });

    // Filter by severity threshold
    const severityThreshold = minSeverity === 'all' ? SEVERITY_ORDER.length : SEVERITY_ORDER.indexOf(minSeverity) + 1;
    const eligibleSeverities = SEVERITY_ORDER.slice(0, severityThreshold);

    const toApprove = proposals.filter(p => eligibleSeverities.includes(p.severity));

    if (toApprove.length === 0) {
      return NextResponse.json({
        success: true,
        approved: 0,
        message: 'No proposals match the criteria',
      });
    }

    // Approve each proposal
    const results: { id: string; title: string; linearUrl?: string; error?: string }[] = [];

    for (const proposal of toApprove) {
      try {
        const { issueUrl } = await createLinearIssue(proposal);
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
