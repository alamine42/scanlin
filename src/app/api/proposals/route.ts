import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/supabase/helpers';
import {
  getProposals,
  getProposalById,
  updateProposalStatus,
  snoozeProposal,
} from '@/lib/services/proposals';
import type { Category, Severity, ProposalStatus } from '@/types/database';

async function getWorkspaceContext(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { searchParams } = new URL(request.url);
  const workspaceSlug = searchParams.get('workspace');

  if (!workspaceSlug) {
    return { error: 'Workspace is required', status: 400 };
  }

  const supabase = await createClient();
  const access = await validateWorkspaceAccess(supabase, userId, workspaceSlug);

  if (!access) {
    return { error: 'Access denied', status: 403 };
  }

  return { workspaceId: access.workspaceId, userId: access.userId };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext(request);
    if ('error' in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get('status');
    const category = searchParams.get('category') as Category | null;
    const severity = searchParams.get('severity') as Severity | null;
    const repositoryId = searchParams.get('repository');

    let status: ProposalStatus | ProposalStatus[] | undefined;
    if (statusParam) {
      if (statusParam.includes(',')) {
        status = statusParam.split(',') as ProposalStatus[];
      } else {
        status = statusParam as ProposalStatus;
      }
    }

    const proposals = await getProposals(context.workspaceId, {
      status,
      category: category || undefined,
      severity: severity || undefined,
      repositoryId: repositoryId || undefined,
    });

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error('Failed to fetch proposals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getWorkspaceContext(request);
    if ('error' in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const body = await request.json();
    const { id, status, snooze } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    const existing = await getProposalById(context.workspaceId, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    let updated;

    if (snooze !== undefined) {
      updated = await snoozeProposal(context.workspaceId, id, snooze);
    } else if (status) {
      updated = await updateProposalStatus(context.workspaceId, id, status);
    } else {
      return NextResponse.json(
        { error: 'No valid update provided' },
        { status: 400 }
      );
    }

    return NextResponse.json({ proposal: updated });
  } catch (error) {
    console.error('Failed to update proposal:', error);
    return NextResponse.json(
      { error: 'Failed to update proposal' },
      { status: 500 }
    );
  }
}
