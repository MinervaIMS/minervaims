import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const AlumniSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  surname: z.string().min(1, 'Surname is required').max(100, 'Surname too long').trim(),
  graduation_year: z.number().int().min(1950, 'Graduation year too early').max(2100, 'Graduation year too far in future'),
  // Optional: an alumnus (e.g. a freshly appointed advisor) may not have a
  // current company on file yet.
  company: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? null : val,
    z.string().max(200, 'Company name too long').trim().nullable()
  ),
  city: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? null : val,
    z.string().max(100, 'City name too long').trim().nullable()
  ),
  linkedin_url: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? null : val,
    z.string().max(500, 'LinkedIn URL too long').url('LinkedIn URL must be a valid URL').nullable()
  ).nullable(),
  job_area: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? null : val,
    z.string().max(200, 'Job area too long').trim().nullable()
  ),
});

const DeleteAlumniSchema = z.object({
  id: z.string().uuid('Valid alumni ID is required'),
});

const ActionSchema = z.enum(['create', 'update', 'delete']);

// Activity logging helper
async function logActivity(
  supabase: any,
  userId: string,
  userEmail: string,
  userRole: string,
  action: string,
  entityType: string,
  entityId: string | null,
  entityName: string | null,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details: details || null,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify Supabase Auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has alumni access (full access roles + division heads)
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
    const alumniAccessRoles = [
      'admin', 'president', 'vice_president', 'head_of_asset_management',
      'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant'
    ];
    
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoleNames = userRoles?.map(r => r.role) || [];
    const hasAlumniAccess = isAdminEmail || userRoleNames.some(r => alumniAccessRoles.includes(r));

    if (!hasAlumniAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get primary role for logging
    const priorityOrder = ['president', 'vice_president', 'admin', 'head_of_asset_management', 
      'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant'];
    const primaryRole = priorityOrder.find(r => userRoleNames.includes(r)) || userRoleNames[0] || 'member';

    // Parse request body
    const body = await req.json();
    
    // Validate action
    const actionResult = ActionSchema.safeParse(body.action);
    if (!actionResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid action', details: actionResult.error.format() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const action = actionResult.data;

    // Use different schema based on action
    const schema = action === 'delete' ? DeleteAlumniSchema : AlumniSchema;
    const alumniResult = schema.safeParse(body.alumni);
    if (!alumniResult.success) {
      console.error('Validation error:', alumniResult.error.format());
      return new Response(JSON.stringify({ error: 'Validation failed', details: alumniResult.error.format() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const alumni = alumniResult.data as z.infer<typeof AlumniSchema>;

    console.log('Action:', action, 'Alumni ID:', alumni.id);

    let result;

    switch (action) {
      case 'create':
        result = await supabase
          .from('alumni')
          .insert({
            name: alumni.name,
            surname: alumni.surname,
            graduation_year: alumni.graduation_year,
            company: alumni.company,
            city: alumni.city || null,
            linkedin_url: alumni.linkedin_url || null,
            job_area: alumni.job_area || null,
          })
          .select()
          .single();
        
        if (!result.error) {
          await logActivity(supabase, user.id, user.email!, primaryRole, 'create', 'alumnus', result.data.id, `${alumni.name} ${alumni.surname}`);
        }
        break;

      case 'update':
        if (!alumni.id) {
          return new Response(JSON.stringify({ error: 'Alumni ID is required for update' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await supabase
          .from('alumni')
          .update({
            name: alumni.name,
            surname: alumni.surname,
            graduation_year: alumni.graduation_year,
            company: alumni.company,
            city: alumni.city || null,
            linkedin_url: alumni.linkedin_url || null,
            job_area: alumni.job_area || null,
          })
          .eq('id', alumni.id)
          .select()
          .single();
        
        if (!result.error) {
          await logActivity(supabase, user.id, user.email!, primaryRole, 'update', 'alumnus', alumni.id, `${alumni.name} ${alumni.surname}`);
        }
        break;

      case 'delete':
        if (!alumni.id) {
          return new Response(JSON.stringify({ error: 'Alumni ID is required for delete' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Get alumni name before deleting for logging
        const { data: existingAlumni } = await supabase
          .from('alumni')
          .select('name, surname')
          .eq('id', alumni.id)
          .maybeSingle();
        
        result = await supabase
          .from('alumni')
          .delete()
          .eq('id', alumni.id);
        
        if (!result.error) {
          const alumniName = existingAlumni ? `${existingAlumni.name} ${existingAlumni.surname}` : null;
          await logActivity(supabase, user.id, user.email!, primaryRole, 'delete', 'alumnus', alumni.id, alumniName);
        }
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Operation successful:', result.data);
    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('admin-alumni error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
