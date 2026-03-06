// Database types matching Supabase schema

export type UserRole = 'owner' | 'admin' | 'member';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'snoozed';
export type Category = 'security' | 'testing';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface GitHubConnection {
  id: string;
  workspace_id: string;
  user_id: string;
  github_user_id: number;
  github_username: string;
  access_token_encrypted: string;
  scopes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinearConnection {
  id: string;
  workspace_id: string;
  user_id: string;
  linear_user_id: string;
  linear_organization_id: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  workspace_id: string;
  github_connection_id: string;
  owner: string;
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  workspace_id: string;
  repository_id: string;
  initiated_by: string;
  status: ScanStatus;
  files_scanned: number;
  proposals_found: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  workspace_id: string;
  repository_id: string;
  scan_id: string | null;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  file_path: string;
  line_start: number | null;
  line_end: number | null;
  code_snippet: string | null;
  suggested_fix: string | null;
  rationale: string;
  status: ProposalStatus;
  snoozed_until: string | null;
  linear_issue_id: string | null;
  linear_issue_url: string | null;
  is_pre_existing: boolean;
  existing_linear_issue_id: string | null;
  existing_linear_issue_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinearSettings {
  id: string;
  workspace_id: string;
  linear_connection_id: string;
  default_team_id: string | null;
  default_team_key: string | null;
  created_at: string;
  updated_at: string;
}

// Database helper types for Supabase queries
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Workspace, 'id' | 'created_at'>>;
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: Omit<WorkspaceMember, 'id' | 'created_at'>;
        Update: Partial<Omit<WorkspaceMember, 'id' | 'created_at'>>;
      };
      github_connections: {
        Row: GitHubConnection;
        Insert: Omit<GitHubConnection, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GitHubConnection, 'id' | 'created_at'>>;
      };
      linear_connections: {
        Row: LinearConnection;
        Insert: Omit<LinearConnection, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LinearConnection, 'id' | 'created_at'>>;
      };
      repositories: {
        Row: Repository;
        Insert: Omit<Repository, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Repository, 'id' | 'created_at'>>;
      };
      scans: {
        Row: Scan;
        Insert: Omit<Scan, 'id' | 'created_at'>;
        Update: Partial<Omit<Scan, 'id' | 'created_at'>>;
      };
      proposals: {
        Row: Proposal;
        Insert: Omit<Proposal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Proposal, 'id' | 'created_at'>>;
      };
      linear_settings: {
        Row: LinearSettings;
        Insert: Omit<LinearSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LinearSettings, 'id' | 'created_at'>>;
      };
    };
  };
}
