-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase default)

-- Users table (synced from Clerk via webhooks)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

-- Workspace members junction table
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- GitHub connections (OAuth tokens encrypted with AES-256-GCM)
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_user_id BIGINT NOT NULL,
  github_username TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  scopes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, github_user_id)
);

CREATE INDEX idx_github_connections_workspace ON github_connections(workspace_id);

-- Linear connections (OAuth tokens encrypted with AES-256-GCM)
CREATE TABLE linear_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linear_user_id TEXT NOT NULL,
  linear_organization_id TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, linear_user_id)
);

CREATE INDEX idx_linear_connections_workspace ON linear_connections(workspace_id);

-- Repositories tracked by the workspace
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  github_connection_id UUID NOT NULL REFERENCES github_connections(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  private BOOLEAN DEFAULT false,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, full_name)
);

CREATE INDEX idx_repositories_workspace ON repositories(workspace_id);

-- Scans (analysis runs)
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  files_scanned INTEGER DEFAULT 0,
  proposals_found INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scans_workspace ON scans(workspace_id);
CREATE INDEX idx_scans_repository ON scans(repository_id);
CREATE INDEX idx_scans_status ON scans(status);

-- Proposals (detected issues)
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('security', 'testing')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  file_path TEXT NOT NULL,
  line_start INTEGER,
  line_end INTEGER,
  code_snippet TEXT,
  suggested_fix TEXT,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'snoozed')) DEFAULT 'pending',
  snoozed_until TIMESTAMPTZ,
  linear_issue_id TEXT,
  linear_issue_url TEXT,
  is_pre_existing BOOLEAN DEFAULT false,
  existing_linear_issue_id TEXT,
  existing_linear_issue_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_workspace ON proposals(workspace_id);
CREATE INDEX idx_proposals_repository ON proposals(repository_id);
CREATE INDEX idx_proposals_scan ON proposals(scan_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_category ON proposals(category);
CREATE INDEX idx_proposals_severity ON proposals(severity);

-- Linear settings per workspace
CREATE TABLE linear_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  linear_connection_id UUID NOT NULL REFERENCES linear_connections(id) ON DELETE CASCADE,
  default_team_id TEXT,
  default_team_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Workspaces: users can see workspaces they belong to
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

CREATE POLICY "Owners can update their workspaces" ON workspaces
  FOR UPDATE USING (
    owner_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
  );

CREATE POLICY "Service role can manage workspaces" ON workspaces
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Workspace members: can view members of workspaces they belong to
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

CREATE POLICY "Service role can manage workspace members" ON workspace_members
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- GitHub connections: workspace members can view/manage
CREATE POLICY "Workspace members can view github connections" ON github_connections
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

CREATE POLICY "Workspace members can manage github connections" ON github_connections
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

-- Linear connections: workspace members can view/manage
CREATE POLICY "Workspace members can view linear connections" ON linear_connections
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

CREATE POLICY "Workspace members can manage linear connections" ON linear_connections
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

-- Repositories: workspace members can view/manage
CREATE POLICY "Workspace members can view repositories" ON repositories
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

CREATE POLICY "Workspace members can manage repositories" ON repositories
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

-- Scans: workspace members can view/manage
CREATE POLICY "Workspace members can view scans" ON scans
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

CREATE POLICY "Workspace members can manage scans" ON scans
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

-- Proposals: workspace members can view/manage
CREATE POLICY "Workspace members can view proposals" ON proposals
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

CREATE POLICY "Workspace members can manage proposals" ON proposals
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

-- Linear settings: workspace members can view/manage
CREATE POLICY "Workspace members can view linear settings" ON linear_settings
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

CREATE POLICY "Workspace members can manage linear settings" ON linear_settings
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id', true))
    )
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_connections_updated_at BEFORE UPDATE ON github_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linear_connections_updated_at BEFORE UPDATE ON linear_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linear_settings_updated_at BEFORE UPDATE ON linear_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
