import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/supabase/helpers';
import { getGitHubClient } from '@/lib/integrations/github';
import { getLinearClient, getDefaultTeamId } from '@/lib/integrations/linear';
import { analyzeRepositoryStreaming } from '@/lib/analyzer-multi-tenant';
import { createScan } from '@/lib/services/scans';
import type { Repository } from '@/types/database';
import type { Category } from '@/types/proposal';

export const maxDuration = 300; // 5 minutes for Vercel

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const workspaceSlug = searchParams.get('workspace');

  if (!workspaceSlug) {
    return new Response(
      JSON.stringify({ error: 'Workspace is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get repository and categories from request body
  const body = await request.json().catch(() => ({}));
  const repositoryId = body.repositoryId;
  const categories: Category[] = body.categories || ['security', 'testing', 'tech_debt', 'performance', 'documentation'];

  const supabase = await createClient();

  // Validate workspace access
  const access = await validateWorkspaceAccess(supabase, userId, workspaceSlug);
  if (!access) {
    return new Response(
      JSON.stringify({ error: 'Access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { workspaceId, userId: dbUserId } = access;

  // Get GitHub client
  const octokit = await getGitHubClient(workspaceId);
  if (!octokit) {
    return new Response(
      JSON.stringify({ error: 'GitHub not connected. Please connect your GitHub account in settings.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get repository to scan
  let repository: Repository | null = null;
  if (repositoryId) {
    const repoResult = await supabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .eq('workspace_id', workspaceId)
      .single();

    repository = repoResult.data as Repository | null;
  } else {
    // Get the first/default repository
    const reposResult = await supabase
      .from('repositories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .limit(1);

    const repos = reposResult.data as Repository[] | null;
    repository = repos?.[0] || null;
  }

  if (!repository) {
    return new Response(
      JSON.stringify({ error: 'No repository found. Please add a repository first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check for Anthropic API key BEFORE creating scan record
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY environment variable is not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get Linear client (optional)
  const linearClient = await getLinearClient(workspaceId);
  let linearTeamId: string | null = null;
  if (linearClient) {
    linearTeamId = await getDefaultTeamId(linearClient, workspaceId);
  }

  // Create scan record - only after all prerequisites are validated
  const scan = await createScan(workspaceId, repository.id, dbUserId);
  if (!scan) {
    return new Response(
      JSON.stringify({ error: 'Failed to create scan' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Clear non-approved proposals from previous scans
  // Keep approved proposals to identify duplicates
  await supabase
    .from('proposals')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('repository_id', repository.id)
    .neq('status', 'approved');

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start the analysis in the background
  (async () => {
    try {
      await analyzeRepositoryStreaming(
        repository.full_name,
        {
          workspaceId,
          repositoryId: repository.id,
          scanId: scan.id,
          octokit,
          linearClient,
          linearTeamId,
          categories,
        },
        async (event) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          await writer.write(encoder.encode(data));
        }
      );
    } catch (error) {
      const errorEvent = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Scan failed',
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
