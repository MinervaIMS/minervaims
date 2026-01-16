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
  company: z.string().min(1, 'Company is required').max(200, 'Company name too long').trim(),
  city: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? null : val,
    z.string().max(100, 'City name too long').trim().nullable()
  ),
  linkedin_url: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? null : val,
    z.string().max(500, 'LinkedIn URL too long').url('LinkedIn URL must be a valid URL').nullable()
  ).nullable(),
});

const DeleteAlumniSchema = z.object({
  id: z.string().uuid('Valid alumni ID is required'),
});

const ActionSchema = z.enum(['create', 'update', 'delete']);

// Helper to log activity
async function logActivity(
  supabase: any,
  userId: string,
  userEmail: string,
  userRole: string,
  action: string,
  entityId: string | null,
  entityName: string | null,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      action: action,
      entity_type: 'alumni',
      entity_id: entityId,
      entity_name: entityName,
      details: details || null,
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

// Get user's primary role label
function getPrimaryRoleLabel(roles: { role: string }[]): string {
  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    president: 'President',
    vice_president: 'Vice President',
    head_of_asset_management: 'Head of Asset Management',
    head_of_equity: 'Head of Equity',
    head_of_investment: 'Head of Investment',
    head_of_macro: 'Head of Macro',
    head_of_portfolio: 'Head of Portfolio',
    head_of_quant: 'Head of Quant',
    head_of_operations: 'Head of Operations',
    head_of_media: 'Head of Media',
    portfolio_manager: 'Portfolio Manager',
    member: 'Member',
  }
  const priorityOrder = ['president', 'vice_president', 'admin', 'head_of_asset_management', 
    'head_of_operations', 'head_of_media', 'head_of_equity', 'head_of_investment', 
    'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'portfolio_manager', 'member']
  const userRoleNames = roles.map(r => r.role)
  const primaryRole = priorityOrder.find(r => userRoleNames.includes(r)) || roles[0]?.role || 'Unknown'
  return roleLabels[primaryRole] || primaryRole
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

    // Check if user has alumni management access
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
    
    // Roles that can manage alumni
    const alumniAccessRoles = [
      'admin', 'president', 'vice_president', 'head_of_asset_management',
      'head_of_operations', 'head_of_media'
    ]
    
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const hasAlumniAccess = isAdminEmail || 
      (userRoles && userRoles.some(r => alumniAccessRoles.includes(r.role)))

    if (!hasAlumniAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userRoleLabel = getPrimaryRoleLabel(userRoles || [])

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
          })
          .select()
          .single();
        
        if (!result.error && result.data) {
          await logActivity(supabase, user.id, user.email!, userRoleLabel, 'create', result.data.id, `${alumni.name} ${alumni.surname}`)
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
          })
          .eq('id', alumni.id)
          .select()
          .single();
        
        if (!result.error) {
          await logActivity(supabase, user.id, user.email!, userRoleLabel, 'update', alumni.id, `${alumni.name} ${alumni.surname}`)
        }
        break;

      case 'delete':
        if (!alumni.id) {
          return new Response(JSON.stringify({ error: 'Alumni ID is required for delete' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Get alumni name before deleting
        const { data: alumniToDelete } = await supabase
          .from('alumni')
          .select('name, surname')
          .eq('id', alumni.id)
          .maybeSingle()
        
        result = await supabase
          .from('alumni')
          .delete()
          .eq('id', alumni.id);
        
        if (!result.error) {
          const entityName = alumniToDelete ? `${alumniToDelete.name} ${alumniToDelete.surname}` : null
          await logActivity(supabase, user.id, user.email!, userRoleLabel, 'delete', alumni.id, entityName)
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
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
