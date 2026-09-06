import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { audited } from '../_shared/activity.ts';
import { allows } from '../_shared/access.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================================
// READING THE WINDOW AND SETTING IT ARE TWO QUESTIONS.
// ---------------------------------------------------------------------
// One list answered both, and it was short by two: the matrix grants
// `applications-form` as 'manage' to every HEAD OF DIVISION, and 'view'
// to the ADVISOR, and neither appeared here. A Head of Division opening
// the application form settings saw the page and an empty form, because
// the `get` came back 403 and the page rendered its own defaults - which
// looks exactly like an intake that has not been configured.
//
// The list is replaced entirely rather than extended, because the matrix
// already states this precisely and a second copy is what drifted.
// =====================================================================
const RESOURCE = 'applications-form';

Deno.serve(audited('admin-settings', async (req, audit) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the token AGAINST THE AUTH SERVER (getUser), not by decoding it
    // locally: a revoked or deleted session must be rejected immediately, not
    // only when the token expires.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      console.log('Invalid token:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = { id: authUser.id, email: authUser.email as string | undefined };

    console.log('User authenticated:', user.id, user.email);

    // Check if user has required role
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.log('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRoleNames = userRoles?.map(r => r.role) || [];
    audit.actor(user, userRoleNames);
    const canRead = allows(userRoleNames, user.email, RESOURCE, 'view');
    const canManage = allows(userRoleNames, user.email, RESOURCE, 'manage');

    if (!canRead) {
      console.log('User does not have permission. Roles:', userRoleNames);
      return new Response(
        JSON.stringify({ error: 'Your role does not include the application form settings.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authorized with roles:', userRoleNames);

    const { action, settings } = await req.json();
    audit.request(action, settings ?? {});
    console.log('Action:', action, 'Settings:', settings);

    // `get` is the read. Anything that writes the window needs 'manage'.
    if (action !== 'get' && !canManage) {
      return new Response(
        JSON.stringify({ error: 'Your role can read the application settings but not change them.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'get': {
        const { data, error } = await supabaseAdmin
          .from('application_settings')
          .select('*')
          .limit(1)
          .single();

        if (error) {
          console.log('Error fetching settings:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch settings' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Settings fetched:', data);
        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!settings) {
          return new Response(
            JSON.stringify({ error: 'Settings data required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get existing settings row ID
        const { data: existingSettings, error: fetchError } = await supabaseAdmin
          .from('application_settings')
          .select('id')
          .limit(1)
          .single();

        if (fetchError || !existingSettings) {
          console.log('Error fetching existing settings:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch existing settings' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: Record<string, unknown> = {
          updated_by: user.id,
        };

        if (typeof settings.applications_open === 'boolean') {
          updateData.applications_open = settings.applications_open;
        }
        if (settings.semester_label) {
          updateData.semester_label = settings.semester_label;
        }
        if (settings.apply_form_url) {
          updateData.apply_form_url = settings.apply_form_url;
        }
        // Scheduling (Phase 0 columns): allow setting or clearing the window.
        if ('start_date' in settings) {
          updateData.start_date = settings.start_date || null;
        }
        if ('end_date' in settings) {
          updateData.end_date = settings.end_date || null;
        }
        if (typeof settings.auto_open === 'boolean') {
          updateData.auto_open = settings.auto_open;
        }

        const { data, error } = await supabaseAdmin
          .from('application_settings')
          .update(updateData)
          .eq('id', existingSettings.id)
          .select()
          .single();

        if (error) {
          console.log('Error updating settings:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update settings' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Settings updated:', data);
        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
