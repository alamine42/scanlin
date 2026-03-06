import { createClient } from './server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Helper functions to get common data from Supabase with proper typing.
 * These functions return null on error/not found, allowing callers to handle the response.
 */

export async function getUserByClerkId(
  supabase: SupabaseClient,
  clerkId: string
): Promise<{ id: string } | null> {
  const result = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  const data = result.data as { id: string } | null;
  if (result.error || !data) return null;
  return { id: data.id };
}

/**
 * Get or create a user and their default workspace.
 * This handles the case where the Clerk webhook hasn't fired yet.
 */
export async function getOrCreateUser(
  supabase: SupabaseClient,
  clerkId: string,
  email: string,
  name?: string | null
): Promise<{ userId: string; workspaceSlug: string } | null> {
  // Try to get existing user
  let user = await getUserByClerkId(supabase, clerkId);

  if (!user) {
    // Create user
    const userResult = await supabase
      .from('users')
      .insert({
        clerk_id: clerkId,
        email,
        name: name || email.split('@')[0],
      } as never)
      .select('id')
      .single();

    const userData = userResult.data as { id: string } | null;
    if (userResult.error || !userData) {
      console.error('Failed to create user:', userResult.error);
      return null;
    }
    user = { id: userData.id };
  }

  // Check for existing workspace membership
  const membershipResult = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const membership = membershipResult.data as { workspace_id: string; workspaces: { slug: string } | null } | null;

  if (membership?.workspaces) {
    return { userId: user.id, workspaceSlug: membership.workspaces.slug };
  }

  // Create default workspace
  const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-workspace';
  const workspaceName = name ? `${name}'s Workspace` : 'My Workspace';

  const workspaceResult = await supabase
    .from('workspaces')
    .insert({
      name: workspaceName,
      slug,
      owner_id: user.id,
    } as never)
    .select('id, slug')
    .single();

  const workspace = workspaceResult.data as { id: string; slug: string } | null;
  if (workspaceResult.error || !workspace) {
    console.error('Failed to create workspace:', workspaceResult.error);
    return null;
  }

  // Add user as workspace owner
  const memberResult = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    } as never);

  if (memberResult.error) {
    console.error('Failed to add workspace member:', memberResult.error);
    return null;
  }

  return { userId: user.id, workspaceSlug: workspace.slug };
}

export async function getWorkspaceBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ id: string; name: string; slug: string } | null> {
  const result = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  const data = result.data as { id: string; name: string; slug: string } | null;
  if (result.error || !data) return null;
  return { id: data.id, name: data.name, slug: data.slug };
}

export async function getWorkspaceById(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ id: string; name: string; slug: string } | null> {
  const result = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('id', workspaceId)
    .single();

  const data = result.data as { id: string; name: string; slug: string } | null;
  if (result.error || !data) return null;
  return { id: data.id, name: data.name, slug: data.slug };
}

export async function checkMembership(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<{ id: string; role: string } | null> {
  const result = await supabase
    .from('workspace_members')
    .select('id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  const data = result.data as { id: string; role: string } | null;
  if (result.error || !data) return null;
  return { id: data.id, role: data.role };
}

/**
 * Validates that a user has access to a workspace.
 * Returns workspace and user info if valid, null otherwise.
 */
export async function validateWorkspaceAccess(
  supabase: SupabaseClient,
  clerkId: string,
  workspaceSlug: string
): Promise<{ userId: string; workspaceId: string; workspaceName: string } | null> {
  const user = await getUserByClerkId(supabase, clerkId);
  if (!user) return null;

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) return null;

  const membership = await checkMembership(supabase, workspace.id, user.id);
  if (!membership) return null;

  return {
    userId: user.id,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };
}

/**
 * Validates workspace access using workspaceId instead of slug.
 */
export async function validateWorkspaceAccessById(
  supabase: SupabaseClient,
  clerkId: string,
  workspaceId: string
): Promise<{ userId: string; workspaceId: string; workspaceSlug: string } | null> {
  const user = await getUserByClerkId(supabase, clerkId);
  if (!user) return null;

  const workspace = await getWorkspaceById(supabase, workspaceId);
  if (!workspace) return null;

  const membership = await checkMembership(supabase, workspace.id, user.id);
  if (!membership) return null;

  return {
    userId: user.id,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
  };
}
