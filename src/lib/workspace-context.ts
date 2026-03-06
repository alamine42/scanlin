'use client';

import { createContext, useContext } from 'react';
import type { Workspace, WorkspaceMember, GitHubConnection, LinearConnection } from '@/types/database';

export interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  membership: WorkspaceMember | null;
  githubConnection: GitHubConnection | null;
  linearConnection: LinearConnection | null;
  isLoading: boolean;
  error: string | null;
  refreshWorkspace: () => Promise<void>;
  switchWorkspace: (slug: string) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  workspaces: [],
  membership: null,
  githubConnection: null,
  linearConnection: null,
  isLoading: true,
  error: null,
  refreshWorkspace: async () => {},
  switchWorkspace: () => {},
});

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
