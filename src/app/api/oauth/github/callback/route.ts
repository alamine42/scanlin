import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/sign-in`);
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('GitHub OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent('Missing authorization code')}`
      );
    }

    // Verify state from cookie
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get('github_oauth_state');

    if (!stateCookie?.value) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent('Invalid state - please try again')}`
      );
    }

    let stateData: { state: string; workspaceSlug: string; workspaceId: string; userId: string };
    try {
      stateData = JSON.parse(stateCookie.value);
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent('Invalid state format')}`
      );
    }

    if (stateData.state !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent('State mismatch - possible CSRF attack')}`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/github/callback`,
      }),
    });

    const tokenData: GitHubTokenResponse = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token error:', tokenData.error, tokenData.error_description);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${stateData.workspaceSlug}/settings/integrations?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`
      );
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${stateData.workspaceSlug}/settings/integrations?error=${encodeURIComponent('Failed to fetch GitHub user info')}`
      );
    }

    const githubUser: GitHubUserResponse = await userResponse.json();

    // Encrypt the access token
    const encryptedToken = encrypt(tokenData.access_token);

    // Store connection in database
    const supabase = await createClient();

    // Check if connection already exists
    const existingResult = await supabase
      .from('github_connections')
      .select('id')
      .eq('workspace_id', stateData.workspaceId)
      .eq('github_user_id', githubUser.id)
      .single();

    const existingConnection = existingResult.data as { id: string } | null;

    if (existingConnection) {
      // Update existing connection
      await supabase
        .from('github_connections')
        .update({
          access_token_encrypted: encryptedToken,
          github_username: githubUser.login,
          scopes: tokenData.scope,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', existingConnection.id);
    } else {
      // Create new connection
      await supabase.from('github_connections').insert({
        workspace_id: stateData.workspaceId,
        user_id: stateData.userId,
        github_user_id: githubUser.id,
        github_username: githubUser.login,
        access_token_encrypted: encryptedToken,
        scopes: tokenData.scope,
      } as never);
    }

    // Clear the state cookie and redirect
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/${stateData.workspaceSlug}/settings/integrations?success=github`
    );

    response.cookies.delete('github_oauth_state');

    return response;
  } catch (error) {
    console.error('Error in GitHub callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
