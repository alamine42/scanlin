import { redirect, notFound } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/server';
import { WorkspaceProvider } from '@/components/workspace/workspace-provider';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { MobileNav } from '@/components/navigation/mobile-nav';
import Link from 'next/link';
import type { Workspace, WorkspaceMember } from '@/types/database';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}

async function getUser(supabase: Awaited<ReturnType<typeof createClient>>, clerkId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

async function getWorkspace(supabase: Awaited<ReturnType<typeof createClient>>, slug: string): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }
  return data as Workspace;
}

async function getMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }
  return data as WorkspaceMember;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { userId } = await auth();
  const { workspaceSlug } = await params;

  if (!userId) {
    return redirect('/sign-in');
  }

  const supabase = await createClient();

  // Get user from Supabase
  const userResult = await getUser(supabase, userId);
  if (!userResult) {
    return redirect('/sign-in');
  }
  const user: { id: string } = userResult;

  // Get workspace by slug
  const workspaceResult = await getWorkspace(supabase, workspaceSlug);
  if (!workspaceResult) {
    return notFound();
  }
  const workspace: Workspace = workspaceResult;

  // Check membership
  const membershipResult = await getMembership(supabase, workspace.id, user.id);
  if (!membershipResult) {
    return notFound();
  }
  const membership: WorkspaceMember = membershipResult;

  // Get all user workspaces for the switcher
  const membershipList = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      workspaces (
        id,
        name,
        slug,
        owner_id,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id);

  const workspaces = (membershipList.data || [])
    .map((m: { workspaces: Workspace | null }) => m.workspaces)
    .filter((w): w is Workspace => w !== null);

  // Get connections for context
  const { data: githubConnection } = await supabase
    .from('github_connections')
    .select('id, workspace_id, user_id, github_user_id, github_username, scopes, created_at, updated_at')
    .eq('workspace_id', workspace.id)
    .limit(1)
    .single();

  const { data: linearConnection } = await supabase
    .from('linear_connections')
    .select('id, workspace_id, user_id, linear_user_id, linear_organization_id, expires_at, created_at, updated_at')
    .eq('workspace_id', workspace.id)
    .limit(1)
    .single();

  const clerkUser = await currentUser();

  return (
    <WorkspaceProvider
      initialWorkspace={{
        workspace,
        membership,
        githubConnection: githubConnection || null,
        linearConnection: linearConnection || null,
      }}
      initialWorkspaces={workspaces as any[]}
    >
      <div className="min-h-screen pb-20 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Left: Logo and workspace */}
              <div className="flex items-center gap-3 md:gap-4">
                <Link
                  href={`/${workspaceSlug}`}
                  className="flex items-center gap-2.5 group"
                >
                  {/* Logo */}
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-glow transition-shadow duration-300">
                      <svg
                        className="w-4 h-4 text-white"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M3.5 18.5l6-6-6-6 2.83-2.83L16.67 14a1 1 0 010 1.41L6.33 25.83 3.5 23z" transform="scale(0.7) translate(2, 2)" />
                        <path d="M20.5 18.5l-6-6 6-6-2.83-2.83L7.33 14a1 1 0 000 1.41l10.34 10.42 2.83-2.83z" transform="scale(0.7) translate(2, 2)" />
                      </svg>
                    </div>
                  </div>
                  <span className="hidden md:block font-semibold text-foreground">
                    ScanLin
                  </span>
                </Link>

                {/* Beta badge */}
                <span className="hidden sm:inline-flex text-2xs font-medium px-2 py-0.5 rounded-full bg-primary-muted text-primary-hover border border-primary/20">
                  Beta
                </span>

                {/* Divider */}
                <div className="hidden md:block h-5 w-px bg-border" />

                {/* Workspace switcher */}
                <div className="hidden md:block">
                  <WorkspaceSwitcher />
                </div>
              </div>

              {/* Center: Desktop Navigation */}
              <nav className="hidden md:flex items-center">
                <NavLink href={`/${workspaceSlug}`} exact>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Dashboard
                </NavLink>
                <NavLink href={`/${workspaceSlug}/repositories`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Repositories
                </NavLink>
                <NavLink href={`/${workspaceSlug}/settings`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </NavLink>
              </nav>

              {/* Right: User button */}
              <div className="flex items-center gap-3">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8 ring-2 ring-border hover:ring-border-hover transition-all',
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 animate-fade-in">
          {children}
        </main>

        {/* Mobile Navigation */}
        <MobileNav workspaceSlug={workspaceSlug} />
      </div>
    </WorkspaceProvider>
  );
}

// Navigation link component
function NavLink({
  href,
  exact,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground-muted hover:text-foreground rounded-md hover:bg-surface-hover transition-colors"
    >
      {children}
    </Link>
  );
}
