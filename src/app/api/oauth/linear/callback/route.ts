import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

interface LinearTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

interface LinearUserResponse {
  data: {
    viewer: {
      id: string;
      name: string;
      email: string;
      organization: {
        id: string;
        name: string;
      };
    };
  };
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
      console.error('Linear OAuth error:', error, errorDescription);
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
    const stateCookie = cookieStore.get('linear_oauth_state');

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
    const tokenResponse = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.LINEAR_OAUTH_CLIENT_ID!,
        client_secret: process.env.LINEAR_OAUTH_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linear/callback`,
      }),
    });

    const tokenData: LinearTokenResponse = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Linear token error:', tokenData.error, tokenData.error_description);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${stateData.workspaceSlug}/settings/integrations?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`
      );
    }

    // Get Linear user info using GraphQL
    const userResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            viewer {
              id
              name
              email
              organization {
                id
                name
              }
            }
          }
        `,
      }),
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${stateData.workspaceSlug}/settings/integrations?error=${encodeURIComponent('Failed to fetch Linear user info')}`
      );
    }

    const userData: LinearUserResponse = await userResponse.json();
    const linearUser = userData.data.viewer;

    // Encrypt the access token
    const encryptedToken = encrypt(tokenData.access_token);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Store connection in database
    const supabase = await createClient();

    // Check if connection already exists
    const existingResult = await supabase
      .from('linear_connections')
      .select('id')
      .eq('workspace_id', stateData.workspaceId)
      .eq('linear_user_id', linearUser.id)
      .single();

    const existingConnection = existingResult.data as { id: string } | null;

    if (existingConnection) {
      // Update existing connection
      await supabase
        .from('linear_connections')
        .update({
          access_token_encrypted: encryptedToken,
          linear_organization_id: linearUser.organization.id,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', existingConnection.id);
    } else {
      // Create new connection
      await supabase.from('linear_connections').insert({
        workspace_id: stateData.workspaceId,
        user_id: stateData.userId,
        linear_user_id: linearUser.id,
        linear_organization_id: linearUser.organization.id,
        access_token_encrypted: encryptedToken,
        expires_at: expiresAt,
      } as never);
    }

    // Clear the state cookie and redirect
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/${stateData.workspaceSlug}/settings/integrations?success=linear`
    );

    response.cookies.delete('linear_oauth_state');

    return response;
  } catch (error) {
    console.error('Error in Linear callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
