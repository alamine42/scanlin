import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/supabase/helpers';

export async function POST(request: Request) {
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

    // Delete Linear connection and settings
    await supabase
      .from('linear_settings')
      .delete()
      .eq('workspace_id', access.workspaceId);

    const { error: deleteError } = await supabase
      .from('linear_connections')
      .delete()
      .eq('workspace_id', access.workspaceId);

    if (deleteError) {
      console.error('Error deleting Linear connection:', deleteError);
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Linear:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
