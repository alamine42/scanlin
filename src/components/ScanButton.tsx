'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ScanProgress {
  phase: 'fetching' | 'analyzing' | 'complete';
  current: number;
  total: number;
  currentFile?: string;
  foundCount: number;
}

interface ScanButtonProps {
  hasProposals?: boolean;
  disabled?: boolean;
  workspaceSlug?: string;
  repositoryId?: string;
}

export function ScanButton({ hasProposals = false, disabled = false, workspaceSlug, repositoryId }: ScanButtonProps) {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setProgress({ phase: 'fetching', current: 0, total: 0, foundCount: 0 });

    try {
      const url = workspaceSlug ? `/api/scan?workspace=${workspaceSlug}` : '/api/scan';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Scan failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let foundCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'progress') {
                setProgress({
                  phase: event.phase,
                  current: event.current || 0,
                  total: event.total || 0,
                  currentFile: event.currentFile,
                  foundCount,
                });
              } else if (event.type === 'proposal') {
                foundCount++;
                setProgress(prev => prev ? { ...prev, foundCount } : null);
                // Refresh to show the new proposal
                router.refresh();
              } else if (event.type === 'complete') {
                setProgress({
                  phase: 'complete',
                  current: event.totalProposals || foundCount,
                  total: event.totalProposals || foundCount,
                  foundCount: event.totalProposals || foundCount,
                });
                setTimeout(() => {
                  setIsScanning(false);
                  setProgress(null);
                  router.refresh();
                }, 1500);
              } else if (event.type === 'error') {
                throw new Error(event.error);
              }
            } catch (e) {
              // Skip malformed JSON
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setIsScanning(false);
      setProgress(null);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all proposals? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      const url = workspaceSlug ? `/api/proposals/clear?workspace=${workspaceSlug}` : '/api/proposals/clear';
      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to clear');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleScan}
        disabled={isScanning || isClearing || disabled}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isScanning ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Scanning...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Scan Repository
          </>
        )}
      </button>

      {hasProposals && !isScanning && (
        <button
          onClick={handleClear}
          disabled={isScanning || isClearing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 text-gray-300 text-sm font-medium rounded-lg transition-colors"
        >
          {isClearing ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Clearing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear All
            </>
          )}
        </button>
      )}

      {progress && progress.phase !== 'complete' && (
        <div className="text-sm text-gray-400">
          {progress.phase === 'fetching' && 'Fetching files...'}
          {progress.phase === 'analyzing' && (
            <span className="flex items-center gap-3">
              <span>
                Analyzing {progress.current}/{progress.total}
              </span>
              {progress.foundCount > 0 && (
                <span className="text-green-400">
                  Found {progress.foundCount} issue{progress.foundCount !== 1 ? 's' : ''}
                </span>
              )}
              {progress.currentFile && (
                <span className="text-gray-500 font-mono text-xs max-w-48 truncate">
                  {progress.currentFile}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {progress?.phase === 'complete' && (
        <div className="text-sm text-green-400">
          Complete! Found {progress.foundCount} issue{progress.foundCount !== 1 ? 's' : ''}
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
