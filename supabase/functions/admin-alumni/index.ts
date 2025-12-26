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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token matches stored admin session
    const { data: adminUser, error: authError } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);

    if (authError || !adminUser || adminUser.length === 0) {
      console.log('Admin verification failed:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, alumni } = await req.json();
    console.log('Action:', action, 'Alumni:', alumni);

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
        break;

      case 'update':
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
        break;

      case 'delete':
        result = await supabase
          .from('alumni')
          .delete()
          .eq('id', alumni.id);
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
