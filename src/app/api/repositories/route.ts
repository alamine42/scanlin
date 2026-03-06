import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess, checkMembership } from '@/lib/supabase/helpers';
import { listRepositories } from '@/lib/integrations/github';
import { getRepositories, addRepository, removeRepository } from '@/lib/services/repositories';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspace');
    const listAvailable = searchParams.get('available') === 'true';

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'Workspace is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Validate workspace access
    const access = await validateWorkspaceAccess(supabase, userId, workspaceSlug);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { workspaceId } = access;

    if (listAvailable) {
      // List available repositories from GitHub
      const available = await listRepositories(workspaceId);
      const added = await getRepositories(workspaceId);
      const addedFullNames = new Set(added.map(r => r.full_name));

      // Filter out already added repos
      const notAdded = available.filter(r => !addedFullNames.has(r.full_name));

      return NextResponse.json({ repositories: notAdded });
    }

    // Get repositories added to workspace
    const repositories = await getRepositories(workspaceId);
    return NextResponse.json({ repositories });
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}

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
    const { owner, name, full_name, default_branch, private: isPrivate } = body;

    if (!full_name) {
      return NextResponse.json({ error: 'Repository full_name is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Validate workspace access
    const access = await validateWorkspaceAccess(supabase, userId, workspaceSlug);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { workspaceId } = access;

    // Get GitHub connection
    const githubResult = await supabase
      .from('github_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .single();

    const githubConnection = githubResult.data as { id: string } | null;
    if (!githubConnection) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 400 }
      );
    }

    // Add repository
    const repository = await addRepository(workspaceId, githubConnection.id, {
      owner,
      name,
      full_name,
      default_branch: default_branch || 'main',
      private: isPrivate || false,
    });

    if (!repository) {
      return NextResponse.json({ error: 'Failed to add repository' }, { status: 500 });
    }

    return NextResponse.json({ repository }, { status: 201 });
  } catch (error) {
    console.error('Failed to add repository:', error);
    return NextResponse.json(
      { error: 'Failed to add repository' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspace');
    const repositoryId = searchParams.get('id');

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'Workspace is required' }, { status: 400 });
    }

    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Validate workspace access
    const access = await validateWorkspaceAccess(supabase, userId, workspaceSlug);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove repository
    const success = await removeRepository(access.workspaceId, repositoryId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to remove repository' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove repository:', error);
    return NextResponse.json(
      { error: 'Failed to remove repository' },
      { status: 500 }
    );
  }
}
