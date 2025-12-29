import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Roles allowed to manage application settings
const ALLOWED_ROLES = ['admin', 'president', 'vice_president', 'head_of_asset_management'];

Deno.serve(async (req) => {
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
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.log('Invalid token or user not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
    const hasAllowedRole = userRoleNames.some(role => ALLOWED_ROLES.includes(role));

    if (!isAdminEmail && !hasAllowedRole) {
      console.log('User does not have permission. Roles:', userRoleNames);
      return new Response(
        JSON.stringify({ error: 'Permission denied. Only President, Vice President, and Head of Asset Management can manage application settings.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authorized with roles:', userRoleNames);

    const { action, settings } = await req.json();
    console.log('Action:', action, 'Settings:', settings);

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
});