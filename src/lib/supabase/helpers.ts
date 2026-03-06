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
