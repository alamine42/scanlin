import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/helpers';
import type { Workspace } from '@/types/database';

// GET /api/workspaces - List all workspaces for the current user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get user from Supabase
    const user = await getUserByClerkId(supabase, userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all workspaces the user is a member of
    const membershipsResult = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        workspaces (
          id,
          name,
          slug,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (membershipsResult.error) {
      console.error('Error fetching memberships:', membershipsResult.error);
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }

    const memberships = membershipsResult.data as Array<{ workspace_id: string; role: string; workspaces: Workspace | null }> | null;
    const workspaces = memberships
      ?.map((m) => m.workspaces)
      .filter((w): w is Workspace => w !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ workspaces: workspaces || [] });
  } catch (error) {
    console.error('Error in GET /api/workspaces:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get user from Supabase
    const user = await getUserByClerkId(supabase, userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a unique slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    // Check for slug conflicts
    while (true) {
      const { data: existing } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the workspace
    const workspaceResult = await supabase
      .from('workspaces')
      .insert({
        name: name.trim(),
        slug,
        owner_id: user.id,
      } as never)
      .select()
      .single();

    const workspace = workspaceResult.data as Workspace | null;
    if (workspaceResult.error || !workspace) {
      console.error('Error creating workspace:', workspaceResult.error);
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }

    // Add user as owner member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      } as never);

    if (memberError) {
      console.error('Error adding workspace member:', memberError);
      // Clean up the workspace
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/workspaces:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
