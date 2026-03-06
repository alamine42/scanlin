'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Repository {
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  default_branch: string;
}

interface RepoPickerProps {
  workspaceSlug: string;
  onClose: () => void;
}

export function RepoPicker({ workspaceSlug, onClose }: RepoPickerProps) {
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, [workspaceSlug]);

  const fetchRepositories = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/repositories?workspace=${workspaceSlug}&available=true`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = await response.json();
      setRepositories(data.repositories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (repo: Repository) => {
    setAdding(repo.full_name);
    setError(null);

    try {
      const response = await fetch(`/api/repositories?workspace=${workspaceSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repo),
      });

      if (!response.ok) {
        throw new Error('Failed to add repository');
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository');
    } finally {
      setAdding(null);
    }
  };

  const filteredRepos = repositories.filter(repo =>
    repo.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Add Repository</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredRepos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {search
                ? 'No repositories match your search'
                : 'No more repositories available to add'}
            </div>
          )}

          {!isLoading && !error && filteredRepos.length > 0 && (
            <div className="space-y-2">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.full_name}
                  className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{repo.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {repo.private && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Private
                          </span>
                        )}
                        <span>{repo.default_branch}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(repo)}
                    disabled={adding === repo.full_name}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex-shrink-0"
                  >
                    {adding === repo.full_name ? 'Adding...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
