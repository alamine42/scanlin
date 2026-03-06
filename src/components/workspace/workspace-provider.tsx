'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { WorkspaceContext } from '@/lib/workspace-context';
import type { Workspace, WorkspaceMember, GitHubConnection, LinearConnection } from '@/types/database';

interface WorkspaceData {
  workspace: Workspace;
  membership: WorkspaceMember;
  githubConnection: GitHubConnection | null;
  linearConnection: LinearConnection | null;
}

interface WorkspaceProviderProps {
  children: ReactNode;
  initialWorkspace?: WorkspaceData | null;
  initialWorkspaces?: Workspace[];
}

export function WorkspaceProvider({
  children,
  initialWorkspace = null,
  initialWorkspaces = [],
}: WorkspaceProviderProps) {
  const router = useRouter();
  const params = useParams();
  const { isLoaded, isSignedIn } = useUser();

  const [workspace, setWorkspace] = useState<Workspace | null>(initialWorkspace?.workspace ?? null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [membership, setMembership] = useState<WorkspaceMember | null>(initialWorkspace?.membership ?? null);
  const [githubConnection, setGithubConnection] = useState<GitHubConnection | null>(
    initialWorkspace?.githubConnection ?? null
  );
  const [linearConnection, setLinearConnection] = useState<LinearConnection | null>(
    initialWorkspace?.linearConnection ?? null
  );
  const [isLoading, setIsLoading] = useState(!initialWorkspace);
  const [error, setError] = useState<string | null>(null);

  const workspaceSlug = params?.workspaceSlug as string | undefined;

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await fetch('/api/workspaces');
      if (!response.ok) throw new Error('Failed to fetch workspaces');
      const data = await response.json();
      setWorkspaces(data.workspaces);
      return data.workspaces as Workspace[];
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      setError('Failed to load workspaces');
      return [];
    }
  }, []);

  const fetchWorkspaceData = useCallback(async (slug: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Workspace not found');
        }
        throw new Error('Failed to fetch workspace');
      }

      const data: WorkspaceData = await response.json();
      setWorkspace(data.workspace);
      setMembership(data.membership);
      setGithubConnection(data.githubConnection);
      setLinearConnection(data.linearConnection);
    } catch (err) {
      console.error('Error fetching workspace:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
      setWorkspace(null);
      setMembership(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (workspaceSlug) {
      await fetchWorkspaceData(workspaceSlug);
    }
  }, [workspaceSlug, fetchWorkspaceData]);

  const switchWorkspace = useCallback((slug: string) => {
    router.push(`/${slug}`);
  }, [router]);

  // Fetch workspaces on mount
  useEffect(() => {
    if (isLoaded && isSignedIn && workspaces.length === 0) {
      fetchWorkspaces();
    }
  }, [isLoaded, isSignedIn, workspaces.length, fetchWorkspaces]);

  // Fetch workspace data when slug changes
  useEffect(() => {
    if (isLoaded && isSignedIn && workspaceSlug && !initialWorkspace) {
      fetchWorkspaceData(workspaceSlug);
    }
  }, [isLoaded, isSignedIn, workspaceSlug, initialWorkspace, fetchWorkspaceData]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaces,
        membership,
        githubConnection,
        linearConnection,
        isLoading,
        error,
        refreshWorkspace,
        switchWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
