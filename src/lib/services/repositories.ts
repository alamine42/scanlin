import { createClient } from '@/lib/supabase/server';
import type { Repository } from '@/types/database';

/**
 * Get all repositories for a workspace
 */
export async function getRepositories(workspaceId: string): Promise<Repository[]> {
  const supabase = await createClient();

  const result = await supabase
    .from('repositories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  const data = result.data as Repository[] | null;

  if (result.error) {
    console.error('Error fetching repositories:', result.error);
    return [];
  }

  return data || [];
}

/**
 * Get a single repository by ID
 */
export async function getRepositoryById(
  workspaceId: string,
  repositoryId: string
): Promise<Repository | null> {
  const supabase = await createClient();

  const result = await supabase
    .from('repositories')
    .select('*')
    .eq('id', repositoryId)
    .eq('workspace_id', workspaceId)
    .single();

  const data = result.data as Repository | null;

  if (result.error || !data) {
    return null;
  }

  return data;
}

/**
 * Get a repository by full name (owner/repo)
 */
export async function getRepositoryByFullName(
  workspaceId: string,
  fullName: string
): Promise<Repository | null> {
  const supabase = await createClient();

  const result = await supabase
    .from('repositories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('full_name', fullName)
    .single();

  const data = result.data as Repository | null;

  if (result.error || !data) {
    return null;
  }

  return data;
}

/**
 * Add a repository to a workspace
 */
export async function addRepository(
  workspaceId: string,
  githubConnectionId: string,
  repoData: {
    owner: string;
    name: string;
    full_name: string;
    default_branch: string;
    private: boolean;
  }
): Promise<Repository | null> {
  const supabase = await createClient();

  // Check if already exists
  const existing = await getRepositoryByFullName(workspaceId, repoData.full_name);
  if (existing) {
    return existing;
  }

  const result = await supabase
    .from('repositories')
    .insert({
      workspace_id: workspaceId,
      github_connection_id: githubConnectionId,
      owner: repoData.owner,
      name: repoData.name,
      full_name: repoData.full_name,
      default_branch: repoData.default_branch,
      private: repoData.private,
    } as never)
    .select()
    .single();

  const data = result.data as Repository | null;

  if (result.error || !data) {
    console.error('Error adding repository:', result.error);
    return null;
  }

  return data;
}

/**
 * Remove a repository from a workspace
 */
export async function removeRepository(
  workspaceId: string,
  repositoryId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('repositories')
    .delete()
    .eq('id', repositoryId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error removing repository:', error);
    return false;
  }

  return true;
}

/**
 * Update repository's last scanned timestamp
 */
export async function updateLastScanned(
  workspaceId: string,
  repositoryId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('repositories')
    .update({ last_scanned_at: new Date().toISOString() } as never)
    .eq('id', repositoryId)
    .eq('workspace_id', workspaceId);
}
