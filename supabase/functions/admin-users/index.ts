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

    // Legacy division-baked head roles map to (head_of_division, division).
    const LEGACY_HEADS: Record<string, string> = {
      head_of_equity: 'equity', head_of_investment: 'investment', head_of_macro: 'macro',
      head_of_portfolio: 'portfolio', head_of_quant: 'quant',
    };
    // ONE identity system: assigning a role here writes the person's MEMBER
    // PROFILE (the single source of truth); workspace access mirrors it via a
    // database trigger. 'admin' is reserved for the association account;
    // advisors are appointed from People > Members (alumni registration
    // first); 'alumni' is reached only through the leave flow.
    const ASSIGNABLE_ROLES = [
      'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
      'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst', 'head_of_media',
      'media_analyst', 'head_of_operations', 'member',
      ...Object.keys(LEGACY_HEADS),
    ];
    const DIVISION_ROLES = ['head_of_division', 'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst'];
    const PUBLIC_ROLES = new Set([
      'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
      'team_leader', 'senior_analyst', 'portfolio_manager', 'analyst', 'head_of_media',
      'media_analyst', 'head_of_operations',
    ]);

    if (action === 'set-role') {
      const { role: rawRole, division: rawDivision } = body as { role?: string; division?: string | null };
      if (!userId || !rawRole) {
        return new Response(JSON.stringify({ error: 'User ID and role are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Nobody changes their OWN role, the President included: a role is
      // always assigned by someone else, so it can never be self-granted.
      if (userId === requestingUser.id) {
        return new Response(JSON.stringify({ error: 'You cannot change your own role. Another President or the association account must do it.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (rawRole === 'admin') {
        return new Response(JSON.stringify({ error: 'The admin role belongs to the association account only and cannot be granted.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (rawRole === 'advisor' || rawRole === 'silent_advisor') {
        return new Response(JSON.stringify({ error: 'Advisors are appointed from People > Members: the flow registers the person as an alumnus first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!ASSIGNABLE_ROLES.includes(rawRole)) {
        return new Response(JSON.stringify({ error: `Invalid role: ${rawRole}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // The association account keeps its account-level admin role; its role
      // is never edited from here.
      {
        const { data: targetProfile } = await supabaseAdmin.from('profiles').select('email').eq('id', userId).maybeSingle();
        if (targetProfile?.email === 'as.minerva@unibocconi.it') {
          return new Response(JSON.stringify({ error: 'The association account cannot be assigned a roster role.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      // Normalise legacy heads to (head_of_division, division).
      let role = rawRole;
      let division = rawDivision || null;
      if (LEGACY_HEADS[rawRole]) { role = 'head_of_division'; division = division || LEGACY_HEADS[rawRole]; }
      // Role ⇄ division pairing rules (mirror of src/lib/roles.ts): board and
      // advisor roles carry no division, department roles are pinned, and
      // core-division roles must name one of the five research divisions.
      const CORE = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
      const FIXED: Record<string, string> = {
        portfolio_manager: 'portfolio', head_of_media: 'media', media_analyst: 'media', head_of_operations: 'operations',
      };
      let div: string | null = null;
      if (FIXED[role]) {
        div = FIXED[role];
      } else if (DIVISION_ROLES.includes(role)) {
        const options = role === 'team_leader' ? CORE.filter((d) => d !== 'portfolio') : CORE;
        if (role === 'team_leader' && division === 'portfolio') {
          return new Response(JSON.stringify({ error: "Portfolio Management's team leader is the Portfolio Manager role — pick that instead." }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!division || !options.includes(division)) {
          return new Response(JSON.stringify({ error: `The role "${role}" requires one of these divisions: ${options.join(', ')}.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        div = division;
      }

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

      // Write THE record: the member profile. Workspace access (user_roles)
      // is mirrored from it by the sync_member_access database trigger, so
      // this one write updates People > Members, this page and the person's
      // permissions in a single, drift-proof step.
      const { data: memberRow } = await supabaseAdmin
        .from('members').select('id, membership_status').eq('user_id', userId).maybeSingle();
      let writeError = null;
      if (memberRow) {
        ({ error: writeError } = await supabaseAdmin.from('members')
          .update({ role, division: div ?? 'none' })
          .eq('id', memberRow.id));
      } else {
        // First assignment to an account that has no member profile yet:
        // create it from the account's own data.
        const { data: targetProfile } = await supabaseAdmin
          .from('profiles').select('full_name, email').eq('id', userId).maybeSingle();
        const fullName = (targetProfile?.full_name || '').trim();
        const parts = fullName.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || (targetProfile?.email?.split('@')[0] ?? 'Member');
        const surname = parts.slice(1).join(' ');
        ({ error: writeError } = await supabaseAdmin.from('members').insert({
          user_id: userId, first_name: firstName, surname,
          email: targetProfile?.email ?? null,
          role, division: div ?? 'none',
          account_status: 'approved', membership_status: 'active',
          fee_status: 'unpaid', is_public: PUBLIC_ROLES.has(role),
        }));
      }
      if (writeError) {
        console.error('Error setting role:', writeError);
        return new Response(JSON.stringify({ error: `Failed to update role: ${writeError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Audit trail.
      try {
        const { data: target } = await supabaseAdmin.from('profiles').select('email').eq('id', userId).maybeSingle();
        await supabaseAdmin.from('activity_logs').insert({
          user_id: requestingUser.id, user_email: requestingUser.email, user_role: 'admin',
          action: 'update', entity_type: 'user_role', entity_id: userId, entity_name: target?.email || userId,
          section: 'Settings', subsection: 'Users',
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

      // Self-deletion is not allowed from the administration surface.
      if (userId === requestingUser.id) {
        return new Response(
          JSON.stringify({ error: 'You cannot delete your own account from here.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
