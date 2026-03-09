'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/proposal';

interface ScanProgress {
  phase: 'fetching' | 'analyzing' | 'complete';
  current: number;
  total: number;
  currentFile?: string;
  foundCount: number;
}

const ALL_CATEGORIES: { id: Category; label: string; icon: string; color: string }[] = [
  { id: 'security', label: 'Security', icon: '🔒', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { id: 'testing', label: 'Testing', icon: '🧪', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'tech_debt', label: 'Tech Debt', icon: '🔧', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'performance', label: 'Performance', icon: '⚡', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { id: 'documentation', label: 'Docs', icon: '📝', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
];

interface DashboardStatsProps {
  initialFilesScanned: number;
  stats: {
    total: number;
    byCategory: {
      security: number;
      testing: number;
      tech_debt: number;
      performance: number;
      documentation: number;
    };
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
  const [showModal, setShowModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(
    new Set(['security', 'testing', 'tech_debt', 'performance', 'documentation'])
  );

  // Use progress.current during scan, otherwise use initial value
  const filesScanned = progress?.phase === 'analyzing' ? progress.current : initialFilesScanned;

  const toggleCategory = (category: Category) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        // Don't allow deselecting all categories
        if (next.size > 1) {
          next.delete(category);
        }
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(new Set(ALL_CATEGORIES.map(c => c.id)));
  };

  const handleStartScan = async () => {
    setShowModal(false);
    setIsScanning(true);
    setError(null);
    setProgress({ phase: 'fetching', current: 0, total: 0, foundCount: 0 });

    try {
      const url = `/api/scan?workspace=${workspaceSlug}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId,
          categories: Array.from(selectedCategories),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Scan failed');
      }

      // Refresh to clear old proposals (scan API clears non-approved proposals)
      router.refresh();

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

  // Close modal on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showModal) {
      setShowModal(false);
    }
  }, [showModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-6">
      {/* Scan Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowModal(true)}
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

      {/* Compact Stats Row */}
      {(stats.total > 0 || isScanning) && (
        <div className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-lg bg-surface border border-border",
          isScanning && progress?.phase === 'analyzing' && 'ring-2 ring-primary/50'
        )}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted">Files:</span>
            <span className="text-sm font-medium text-foreground">{filesScanned}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted">Issues:</span>
            <span className="text-sm font-medium text-foreground">{stats.total + (progress?.foundCount || 0)}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">🔒</span>
            <span className="text-sm text-foreground">{stats.byCategory.security}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-400">🧪</span>
            <span className="text-sm text-foreground">{stats.byCategory.testing}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400">🔧</span>
            <span className="text-sm text-foreground">{stats.byCategory.tech_debt}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400">⚡</span>
            <span className="text-sm text-foreground">{stats.byCategory.performance}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400">📝</span>
            <span className="text-sm text-foreground">{stats.byCategory.documentation}</span>
          </div>
          {stats.bySeverity.critical > 0 && (
            <>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-error">Critical:</span>
                <span className="text-sm font-medium text-error">{stats.bySeverity.critical}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Scan Configuration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Scan Repository</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category Selection */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground-muted">
                  Select Categories
                </label>
                <button
                  onClick={selectAllCategories}
                  disabled={selectedCategories.size === ALL_CATEGORIES.length}
                  className="text-xs text-primary-hover hover:text-primary disabled:text-foreground-subtle disabled:cursor-not-allowed transition-colors"
                >
                  Select All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((category) => {
                  const isSelected = selectedCategories.has(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                        isSelected
                          ? category.color
                          : 'bg-background border-border text-foreground-subtle hover:border-border-hover'
                      )}
                    >
                      <span>{category.icon}</span>
                      <span>{category.label}</span>
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-surface-hover hover:bg-border/50 border border-border text-foreground-muted text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartScan}
                disabled={selectedCategories.size === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Start Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
