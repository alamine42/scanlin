import { NextRequest, NextResponse } from 'next/server';
import { getAllProposals, getProposalById, updateProposal, snoozeProposal } from '@/lib/db';
import { Status, Category, Severity } from '@/types/proposal';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get('status');
    const category = searchParams.get('category') as Category | null;
    const severity = searchParams.get('severity') as Severity | null;

    let status: Status | Status[] | undefined;
    if (statusParam) {
      if (statusParam.includes(',')) {
        status = statusParam.split(',') as Status[];
      } else {
        status = statusParam as Status;
      }
    }

    const proposals = getAllProposals({
      status,
      category: category || undefined,
      severity: severity || undefined,
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
    const body = await request.json();
    const { id, status, title, description, snooze } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    const existing = getProposalById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    let updated;

    if (snooze !== undefined) {
      updated = snoozeProposal(id, snooze);
    } else {
      updated = updateProposal({
        id,
        status,
        title,
        description,
      });
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
