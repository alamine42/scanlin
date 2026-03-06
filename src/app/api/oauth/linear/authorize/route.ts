import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/supabase/helpers';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspace');

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'Workspace is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Validate workspace access
    const access = await validateWorkspaceAccess(supabase, userId, workspaceSlug);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString('hex');

    // Store state in a cookie for verification
    const stateData = JSON.stringify({
      state,
      workspaceSlug,
      workspaceId: access.workspaceId,
      userId: access.userId,
    });

    // Build Linear OAuth URL
    const clientId = process.env.LINEAR_OAUTH_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'Linear OAuth not configured' }, { status: 500 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linear/callback`;
    // Linear OAuth scopes: read, write, issues:create, etc.
    const scope = 'read write issues:create';

    const linearAuthUrl = new URL('https://linear.app/oauth/authorize');
    linearAuthUrl.searchParams.set('client_id', clientId);
    linearAuthUrl.searchParams.set('redirect_uri', redirectUri);
    linearAuthUrl.searchParams.set('scope', scope);
    linearAuthUrl.searchParams.set('state', state);
    linearAuthUrl.searchParams.set('response_type', 'code');
    linearAuthUrl.searchParams.set('prompt', 'consent');

    // Create response with redirect
    const response = NextResponse.redirect(linearAuthUrl.toString());

    // Set state cookie (httpOnly for security)
    response.cookies.set('linear_oauth_state', stateData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in Linear authorize:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
