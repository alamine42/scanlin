import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { GitHubConnectButton } from '@/components/integrations/github-connect-button';
import { LinearConnectButton } from '@/components/integrations/linear-connect-button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}

interface IntegrationsData {
  githubConnection: {
    id: string;
    github_username: string;
    scopes: string | null;
    created_at: string;
  } | null;
  linearConnection: {
    id: string;
    linear_organization_id: string | null;
    expires_at: string | null;
    created_at: string;
  } | null;
}

async function getIntegrationsData(
  userId: string,
  workspaceSlug: string
): Promise<IntegrationsData | null> {
  const supabase = await createClient();

  // Get user
  const userQuery = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();
  const userData = userQuery.data as { id: string } | null;
  if (userQuery.error || !userData) {
    return null;
  }

  // Get workspace
  const workspaceQuery = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('slug', workspaceSlug)
    .single();
  const workspaceData = workspaceQuery.data as { id: string; name: string } | null;
  if (workspaceQuery.error || !workspaceData) {
    return null;
  }

  const workspaceId = workspaceData.id;

  // Check membership
  const membershipQuery = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userData.id)
    .single();
  if (membershipQuery.error || !membershipQuery.data) {
    return null;
  }

  // Get GitHub connection
  const githubQuery = await supabase
    .from('github_connections')
    .select('id, github_username, scopes, created_at')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .single();

  // Get Linear connection
  const linearQuery = await supabase
    .from('linear_connections')
    .select('id, linear_organization_id, expires_at, created_at')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .single();

  return {
    githubConnection: githubQuery.data as IntegrationsData['githubConnection'],
    linearConnection: linearQuery.data as IntegrationsData['linearConnection'],
  };
}

export default async function IntegrationsPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const { success, error } = await searchParams;
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const data = await getIntegrationsData(userId, workspaceSlug);

  if (!data) {
    notFound();
  }

  const { githubConnection, linearConnection } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href={`/${workspaceSlug}/settings`}
          className="text-gray-400 hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-gray-400 mt-1">Connect your GitHub and Linear accounts</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              {success === 'github' && 'GitHub connected successfully!'}
              {success === 'linear' && 'Linear connected successfully!'}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{decodeURIComponent(error)}</span>
          </div>
        </div>
      )}

      {/* GitHub Integration */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">GitHub</h2>
              <p className="text-sm text-gray-400 mt-1">
                Connect your GitHub account to scan repositories for security vulnerabilities and testing gaps.
              </p>
              {githubConnection && (
                <div className="mt-3 text-xs text-gray-500">
                  <span>Connected {new Date(githubConnection.created_at).toLocaleDateString()}</span>
                  {githubConnection.scopes && (
                    <span className="ml-2">Scopes: {githubConnection.scopes}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <GitHubConnectButton
            workspaceSlug={workspaceSlug}
            isConnected={!!githubConnection}
            username={githubConnection?.github_username}
          />
        </div>
      </section>

      {/* Linear Integration */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" viewBox="0 0 100 100" fill="currentColor">
                <path d="M15.08,66.92l19-19-19-19,11.3-11.31L64.69,55.9a4,4,0,0,1,0,5.66L26.38,99.87Z" />
                <path d="M84.92,66.92l-19-19,19-19L73.62,17.61,35.31,55.9a4,4,0,0,0,0,5.66L73.62,99.87Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Linear</h2>
              <p className="text-sm text-gray-400 mt-1">
                Connect your Linear account to create issues from approved proposals.
              </p>
              {linearConnection && (
                <div className="mt-3 text-xs text-gray-500">
                  <span>Connected {new Date(linearConnection.created_at).toLocaleDateString()}</span>
                  {linearConnection.expires_at && (
                    <span className="ml-2">
                      Expires {new Date(linearConnection.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <LinearConnectButton
            workspaceSlug={workspaceSlug}
            isConnected={!!linearConnection}
            organizationId={linearConnection?.linear_organization_id || undefined}
          />
        </div>
      </section>

      {/* Info */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-400">
            <p className="font-medium text-gray-300">About OAuth connections</p>
            <p className="mt-1">
              Your OAuth tokens are encrypted at rest and are only used to access the specific scopes you authorized.
              You can revoke access at any time by disconnecting or through your GitHub/Linear settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
