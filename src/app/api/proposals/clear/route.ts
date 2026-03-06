import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess, checkMembership } from '@/lib/supabase/helpers';
import { clearProposals } from '@/lib/services/proposals';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspace');
    const repositoryId = searchParams.get('repository');

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'Workspace is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Validate workspace access
    const access = await validateWorkspaceAccess(supabase, userId, workspaceSlug);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check role (only admins and owners can clear)
    const membership = await checkMembership(supabase, access.workspaceId, access.userId);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Only owners and admins can clear proposals' }, { status: 403 });
    }

    await clearProposals(access.workspaceId, repositoryId || undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear proposals:', error);
    return NextResponse.json(
      { error: 'Failed to clear proposals' },
      { status: 500 }
    );
  }
}
