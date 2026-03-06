'use client';

import { useWorkspace } from '@/lib/workspace-context';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SettingsPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;
  const { workspace, membership, githubConnection, linearConnection, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-64 bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Workspace Settings</h1>
        <p className="text-gray-400 mt-1">Manage your workspace configuration</p>
      </div>

      {/* General Settings */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">General</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Workspace Name</label>
            <p className="text-white">{workspace.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Workspace Slug</label>
            <p className="text-white font-mono text-sm">{workspace.slug}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Your Role</label>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
              membership?.role === 'owner'
                ? 'bg-purple-500/20 text-purple-400'
                : membership?.role === 'admin'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-700 text-gray-300'
            }`}>
              {membership?.role || 'member'}
            </span>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Integrations</h2>
          <Link
            href={`/${workspaceSlug}/settings/integrations`}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Manage
          </Link>
        </div>

        <div className="space-y-4">
          {/* GitHub Connection */}
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <div>
                <p className="text-white font-medium">GitHub</p>
                {githubConnection ? (
                  <p className="text-sm text-gray-400">
                    Connected as <span className="text-green-400">@{githubConnection.github_username}</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Not connected</p>
                )}
              </div>
            </div>
            <div>
              {githubConnection ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Connected
                </span>
              ) : (
                <Link
                  href={`/${workspaceSlug}/settings/integrations`}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Connect
                </Link>
              )}
            </div>
          </div>

          {/* Linear Connection */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-400" viewBox="0 0 100 100" fill="currentColor">
                <path d="M15.08,66.92l19-19-19-19,11.3-11.31L64.69,55.9a4,4,0,0,1,0,5.66L26.38,99.87Z" />
                <path d="M84.92,66.92l-19-19,19-19L73.62,17.61,35.31,55.9a4,4,0,0,0,0,5.66L73.62,99.87Z" />
              </svg>
              <div>
                <p className="text-white font-medium">Linear</p>
                {linearConnection ? (
                  <p className="text-sm text-green-400">Connected</p>
                ) : (
                  <p className="text-sm text-gray-500">Not connected</p>
                )}
              </div>
            </div>
            <div>
              {linearConnection ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Connected
                </span>
              ) : (
                <Link
                  href={`/${workspaceSlug}/settings/integrations`}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Connect
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      {membership?.role === 'owner' && (
        <section className="bg-gray-900 border border-red-900/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Delete Workspace</p>
              <p className="text-sm text-gray-400">
                Permanently delete this workspace and all its data
              </p>
            </div>
            <button
              className="px-4 py-2 text-sm font-medium text-red-400 border border-red-900 rounded-lg hover:bg-red-900/20 transition-colors"
              onClick={() => {
                // TODO: Implement delete confirmation modal
                alert('Delete functionality coming soon');
              }}
            >
              Delete Workspace
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
