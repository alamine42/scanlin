'use client';

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from './ui/card';
import { cn } from '@/lib/utils';

interface ScanProgress {
  phase: 'fetching' | 'analyzing' | 'complete';
  current: number;
  total: number;
  currentFile?: string;
  foundCount: number;
}

interface DashboardStatsProps {
  initialFilesScanned: number;
  stats: {
    total: number;
    byCategory: { security: number; testing: number };
    bySeverity: { critical: number };
  };
  hasGitHubConnection: boolean;
  hasProposals: boolean;
  workspaceSlug: string;
  repositoryId?: string;
}

export function DashboardStats({
  initialFilesScanned,
  stats,
  hasGitHubConnection,
  hasProposals,
  workspaceSlug,
  repositoryId,
}: DashboardStatsProps) {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use progress.current during scan, otherwise use initial value
  const filesScanned = progress?.phase === 'analyzing' ? progress.current : initialFilesScanned;

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setProgress({ phase: 'fetching', current: 0, total: 0, foundCount: 0 });

    try {
      const url = `/api/scan?workspace=${workspaceSlug}`;
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
                router.refresh();
              } else if (event.type === 'complete') {
                setProgress({
                  phase: 'complete',
                  current: event.filesScanned || progress?.total || 0,
                  total: event.filesScanned || progress?.total || 0,
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
      const url = `/api/proposals/clear?workspace=${workspaceSlug}`;
      const response = await fetch(url, { method: 'POST' });

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
    <div className="space-y-6">
      {/* Scan Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleScan}
          disabled={isScanning || isClearing || !hasGitHubConnection}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isScanning ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Scan Repository
            </>
          )}
        </button>

        {hasProposals && !isScanning && (
          <button
            onClick={handleClear}
            disabled={isScanning || isClearing}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground-muted text-sm font-medium rounded-lg transition-colors"
          >
            {isClearing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Clearing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </>
            )}
          </button>
        )}

        {/* Progress indicator */}
        {progress && progress.phase !== 'complete' && (
          <div className="text-sm text-foreground-muted">
            {progress.phase === 'fetching' && 'Fetching files...'}
            {progress.phase === 'analyzing' && (
              <span className="flex items-center gap-3">
                <span>
                  Analyzing {progress.current}/{progress.total}
                </span>
                {progress.foundCount > 0 && (
                  <span className="text-success">
                    Found {progress.foundCount} issue{progress.foundCount !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        {progress?.phase === 'complete' && (
          <div className="text-sm text-success">
            Complete! Found {progress.foundCount} issue{progress.foundCount !== 1 ? 's' : ''}
          </div>
        )}

        {error && <div className="text-sm text-error">{error}</div>}
      </div>

      {/* Stats Grid */}
      {(stats.total > 0 || isScanning) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <StatCard
            label="Files Scanned"
            value={filesScanned}
            color="primary"
            className={cn(isScanning && progress?.phase === 'analyzing' && 'ring-2 ring-primary/50')}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Total Issues"
            value={stats.total + (progress?.foundCount || 0)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Security"
            value={stats.byCategory.security}
            color="error"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
          <StatCard
            label="Testing"
            value={stats.byCategory.testing}
            color="default"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
          />
          <StatCard
            label="Critical"
            value={stats.bySeverity.critical}
            color="error"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>
      )}
    </div>
  );
}
