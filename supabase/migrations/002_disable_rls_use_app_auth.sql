-- Migration: 002_disable_rls_use_app_auth
-- Purpose: Disable RLS policies since we use application-level access control
--
-- The initial schema implemented RLS using a custom GUC (app.clerk_user_id),
-- but the app performs authorization at the application layer using Clerk auth
-- and explicit membership checks in the code. To avoid conflicts with the
-- incomplete RLS setup, we disable RLS on all tables.
--
-- Security is maintained through:
-- 1. Clerk authentication middleware protecting all routes
-- 2. Explicit membership validation in API handlers (validateWorkspaceAccess)
-- 3. Service role key usage for server-side queries

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Service role can manage workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Service role can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can view github connections" ON github_connections;
DROP POLICY IF EXISTS "Workspace members can manage github connections" ON github_connections;
DROP POLICY IF EXISTS "Workspace members can view linear connections" ON linear_connections;
DROP POLICY IF EXISTS "Workspace members can manage linear connections" ON linear_connections;
DROP POLICY IF EXISTS "Workspace members can view repositories" ON repositories;
DROP POLICY IF EXISTS "Workspace members can manage repositories" ON repositories;
DROP POLICY IF EXISTS "Workspace members can view scans" ON scans;
DROP POLICY IF EXISTS "Workspace members can manage scans" ON scans;
DROP POLICY IF EXISTS "Workspace members can view proposals" ON proposals;
DROP POLICY IF EXISTS "Workspace members can manage proposals" ON proposals;
DROP POLICY IF EXISTS "Workspace members can view linear settings" ON linear_settings;
DROP POLICY IF EXISTS "Workspace members can manage linear settings" ON linear_settings;

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE github_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE linear_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE repositories DISABLE ROW LEVEL SECURITY;
ALTER TABLE scans DISABLE ROW LEVEL SECURITY;
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE linear_settings DISABLE ROW LEVEL SECURITY;

-- Note: When proper Supabase auth integration is desired in the future,
-- RLS can be re-enabled with policies that use auth.uid() by:
-- 1. Creating a custom JWT that includes the Clerk user ID as the Supabase UID
-- 2. Or syncing Clerk users with Supabase Auth
-- 3. Re-enabling RLS and creating policies based on auth.uid()
