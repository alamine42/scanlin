import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/helpers';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = await createClient();

  // Get user from Supabase
  const user = await getUserByClerkId(supabase, userId);

  if (!user) {
    // User not synced yet - this shouldn't happen often
    // but could occur if webhook is delayed
    redirect('/sign-in');
  }

  // Get user's first workspace
  const membershipResult = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      workspaces (
        slug
      )
    `)
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const membership = membershipResult.data as { workspace_id: string; workspaces: { slug: string } | null } | null;

  if (membershipResult.error || !membership?.workspaces) {
    // User has no workspace - this shouldn't happen as we create one on signup
    // but handle gracefully by redirecting to a setup page
    redirect('/sign-in');
  }

  // Redirect to user's default workspace
  redirect(`/${membership.workspaces.slug}`);
}
