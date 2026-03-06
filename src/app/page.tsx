import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateUser } from '@/lib/supabase/helpers';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get Clerk user details
  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect('/sign-in');
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    redirect('/sign-in');
  }

  const supabase = await createClient();

  // Get or create user and their workspace
  const result = await getOrCreateUser(
    supabase,
    userId,
    email,
    clerkUser.firstName || clerkUser.username
  );

  if (!result) {
    // Something went wrong - show error page instead of looping
    throw new Error('Failed to initialize user account');
  }

  // Redirect to user's workspace
  redirect(`/${result.workspaceSlug}`);
}
