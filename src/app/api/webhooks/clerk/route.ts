import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  const supabase = createServiceClient();

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const email = email_addresses[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(' ') || null;

    // Create user in Supabase
    const { error: userError } = await supabase
      .from('users')
      .insert({
        clerk_id: id,
        email: email,
        name: name,
        avatar_url: image_url || null,
      } as never);

    if (userError) {
      console.error('Error creating user:', userError);
      return new Response('Error creating user', { status: 500 });
    }

    // Get the newly created user
    const userResult = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', id)
      .single();

    const user = userResult.data as { id: string } | null;
    if (userResult.error || !user) {
      console.error('Error fetching user:', userResult.error);
      return new Response('Error fetching user', { status: 500 });
    }

    // Create a default workspace for the user
    const workspaceName = name ? `${name}'s Workspace` : 'My Workspace';
    const workspaceSlug = `workspace-${id.toLowerCase().slice(0, 8)}`;

    const workspaceResult = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug: workspaceSlug,
        owner_id: user.id,
      } as never)
      .select('id')
      .single();

    const workspace = workspaceResult.data as { id: string } | null;
    if (workspaceResult.error || !workspace) {
      console.error('Error creating workspace:', workspaceResult.error);
      return new Response('Error creating workspace', { status: 500 });
    }

    // Add user as owner of the workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      } as never);

    if (memberError) {
      console.error('Error adding workspace member:', memberError);
      return new Response('Error adding workspace member', { status: 500 });
    }

    console.log(`Created user ${id} with workspace ${workspace.id}`);
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const email = email_addresses[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(' ') || null;

    const { error } = await supabase
      .from('users')
      .update({
        email: email,
        name: name,
        avatar_url: image_url || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('clerk_id', id);

    if (error) {
      console.error('Error updating user:', error);
      return new Response('Error updating user', { status: 500 });
    }

    console.log(`Updated user ${id}`);
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (!id) {
      return new Response('Missing user ID', { status: 400 });
    }

    // Note: You might want to soft delete or handle workspace ownership transfer
    // For now, we'll delete the user (cascades will handle related data)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('clerk_id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return new Response('Error deleting user', { status: 500 });
    }

    console.log(`Deleted user ${id}`);
  }

  return new Response('', { status: 200 });
}
