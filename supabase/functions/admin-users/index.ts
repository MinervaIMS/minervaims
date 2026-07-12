import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the JWT from the Authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestingUser) {
      console.log('Invalid token or user not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const isAdminEmail = requestingUser.email === 'as.minerva@unibocconi.it';
    
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .in('role', ['admin', 'president']);

    const isAdmin = isAdminEmail || (adminRoles && adminRoles.length > 0);

    if (!isAdmin) {
      console.log('User is not admin:', requestingUser.email);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, userId } = body;
    console.log('Action:', action, 'User ID:', userId);

    // Roles an admin/president may assign through the Users page.
    const ASSIGNABLE_ROLES = [
      'admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
      'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst', 'head_of_media',
      'media_analyst', 'head_of_operations', 'advisor', 'silent_advisor', 'alumni', 'member', 'pending',
    ];
    const DIVISION_ROLES = ['head_of_division', 'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst'];

    if (action === 'set-role') {
      const { role, division } = body as { role?: string; division?: string | null };
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: 'User ID and role are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!ASSIGNABLE_ROLES.includes(role)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const div = DIVISION_ROLES.includes(role) ? (division || null) : null;

      // Guard: never allow the LAST President/Admin to be demoted away.
      const { data: leaders } = await supabaseAdmin
        .from('user_roles').select('user_id, role').in('role', ['admin', 'president']);
      const leaderIds = new Set((leaders || []).map((r: { user_id: string }) => r.user_id));
      const targetIsLeader = leaderIds.has(userId);
      const demotingLeader = targetIsLeader && role !== 'admin' && role !== 'president';
      if (demotingLeader && leaderIds.size <= 1) {
        return new Response(JSON.stringify({ error: 'Cannot remove the last President/Admin. Assign another one first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Upsert the (single) role row for this user.
      const { data: existing } = await supabaseAdmin
        .from('user_roles').select('id').eq('user_id', userId).maybeSingle();
      const payload = { role, division: div, assigned_by: requestingUser.id, assigned_at: new Date().toISOString() };
      const { error: writeError } = existing?.id
        ? await supabaseAdmin.from('user_roles').update(payload).eq('id', existing.id)
        : await supabaseAdmin.from('user_roles').insert({ user_id: userId, ...payload });
      if (writeError) {
        console.error('Error setting role:', writeError);
        return new Response(JSON.stringify({ error: 'Failed to update role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Audit trail.
      try {
        const { data: target } = await supabaseAdmin.from('profiles').select('email').eq('id', userId).maybeSingle();
        await supabaseAdmin.from('activity_logs').insert({
          user_id: requestingUser.id, user_email: requestingUser.email, user_role: 'admin',
          action: 'update', entity_type: 'user_role', entity_id: userId, entity_name: target?.email || userId,
          details: { role, division: div },
        });
      } catch (logErr) { console.error('Failed to log role change:', logErr); }

      return new Response(JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user info to check if it's the admin email
      const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (fetchError) {
        console.error('Error fetching user:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (userData.user?.email === 'as.minerva@unibocconi.it') {
        return new Response(
          JSON.stringify({ error: 'Cannot delete admin account' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete user roles first (due to foreign key)
      const { error: roleDeleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleDeleteError) {
        console.error('Error deleting user roles:', roleDeleteError);
      }

      // Delete profile
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileDeleteError) {
        console.error('Error deleting profile:', profileDeleteError);
      }

      // Delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('User deleted successfully:', userId);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-users function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
