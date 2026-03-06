import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess, checkMembership, getUserByClerkId, getWorkspaceBySlug } from '@/lib/supabase/helpers';
import type { Workspace, WorkspaceMember } from '@/types/database';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/workspaces/[slug] - Get workspace details
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const supabase = await createClient();

    // Get user from Supabase
    const user = await getUserByClerkId(supabase, userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get workspace by slug
    const workspace = await getWorkspaceBySlug(supabase, slug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is a member
    const membership = await checkMembership(supabase, workspace.id, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get full workspace data
    const workspaceResult = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspace.id)
      .single();
    const fullWorkspace = workspaceResult.data as Workspace | null;

    // Get full membership data
    const membershipResult = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();
    const fullMembership = membershipResult.data as WorkspaceMember | null;

    // Get GitHub connection for this workspace
    const githubResult = await supabase
      .from('github_connections')
      .select('id, workspace_id, user_id, github_user_id, github_username, scopes, created_at, updated_at')
      .eq('workspace_id', workspace.id)
      .limit(1)
      .single();

    // Get Linear connection for this workspace
    const linearResult = await supabase
      .from('linear_connections')
      .select('id, workspace_id, user_id, linear_user_id, linear_organization_id, expires_at, created_at, updated_at')
      .eq('workspace_id', workspace.id)
      .limit(1)
      .single();

    return NextResponse.json({
      workspace: fullWorkspace,
      membership: fullMembership,
      githubConnection: githubResult.data || null,
      linearConnection: linearResult.data || null,
    });
  } catch (error) {
    console.error('Error in GET /api/workspaces/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/workspaces/[slug] - Update workspace
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { name } = body;

    const supabase = await createClient();

    // Validate workspace access
    const access = await validateWorkspaceAccess(supabase, userId, slug);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user is owner or admin
    const membership = await checkMembership(supabase, access.workspaceId, access.userId);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Only owners and admins can update workspace settings' }, { status: 403 });
    }

    // Update workspace
    const updates: { name?: string } = {};
    if (name && typeof name === 'string' && name.trim().length > 0) {
      updates.name = name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const { data: updatedWorkspace, error: updateError } = await supabase
      .from('workspaces')
      .update(updates as never)
      .eq('id', access.workspaceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating workspace:', updateError);
      return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
    }

    return NextResponse.json({ workspace: updatedWorkspace });
  } catch (error) {
    console.error('Error in PATCH /api/workspaces/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/workspaces/[slug] - Delete workspace
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const supabase = await createClient();

    // Get user from Supabase
    const user = await getUserByClerkId(supabase, userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get workspace by slug
    const workspaceResult = await supabase
      .from('workspaces')
      .select('*')
      .eq('slug', slug)
      .single();

    const workspace = workspaceResult.data as Workspace | null;
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Only owner can delete
    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the workspace owner can delete it' }, { status: 403 });
    }

    // Delete workspace (cascades will handle related data)
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspace.id);

    if (deleteError) {
      console.error('Error deleting workspace:', deleteError);
      return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/workspaces/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
