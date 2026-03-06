import { createClient } from '@/lib/supabase/server';
import type { Scan, ScanStatus } from '@/types/database';

/**
 * Create a new scan
 */
export async function createScan(
  workspaceId: string,
  repositoryId: string,
  initiatedBy: string
): Promise<Scan | null> {
  const supabase = await createClient();

  const result = await supabase
    .from('scans')
    .insert({
      workspace_id: workspaceId,
      repository_id: repositoryId,
      initiated_by: initiatedBy,
      status: 'pending',
      files_scanned: 0,
      proposals_found: 0,
      started_at: new Date().toISOString(),
    } as never)
    .select()
    .single();

  const data = result.data as Scan | null;

  if (result.error || !data) {
    console.error('Error creating scan:', result.error);
    return null;
  }

  return data;
}

/**
 * Update scan status
 */
export async function updateScanStatus(
  scanId: string,
  status: ScanStatus,
  filesScanned?: number,
  proposalsFound?: number,
  errorMessage?: string
): Promise<void> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };

  if (filesScanned !== undefined) {
    updates.files_scanned = filesScanned;
  }

  if (proposalsFound !== undefined) {
    updates.proposals_found = proposalsFound;
  }

  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date().toISOString();
  }

  await supabase
    .from('scans')
    .update(updates as never)
    .eq('id', scanId);
}

/**
 * Get recent scans for a repository
 */
export async function getRecentScans(
  workspaceId: string,
  repositoryId?: string,
  limit: number = 10
): Promise<Scan[]> {
  const supabase = await createClient();

  let query = supabase
    .from('scans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (repositoryId) {
    query = query.eq('repository_id', repositoryId);
  }

  const result = await query;
  const data = result.data as Scan[] | null;

  if (result.error) {
    console.error('Error fetching scans:', result.error);
    return [];
  }

  return data || [];
}

/**
 * Get the latest scan for a workspace
 */
export async function getLatestScan(
  workspaceId: string,
  repositoryId?: string
): Promise<Scan | null> {
  const scans = await getRecentScans(workspaceId, repositoryId, 1);
  return scans[0] || null;
}
