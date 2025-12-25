import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Simple token validation - decode and check format
    try {
      const decoded = atob(token);
      const [adminId, timestamp] = decoded.split(':');
      
      if (!adminId || !timestamp) {
        throw new Error('Invalid token format');
      }
      
      // Check if token is not older than 24 hours
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return new Response(
          JSON.stringify({ error: 'Token expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify admin exists
      const { data: admin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', adminId)
        .maybeSingle();

      if (!admin) {
        return new Response(
          JSON.stringify({ error: 'Invalid admin' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, event } = body;

    console.log('Admin events action:', action);

    switch (action) {
      case 'create': {
        const { data, error } = await supabase
          .from('events')
          .insert({
            title: event.title,
            date: event.date,
            place: event.place,
            moderator: event.moderator || null,
            guest: event.guest || null,
            description: event.description || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Create event error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Event created:', data.id);
        return new Response(
          JSON.stringify({ success: true, event: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { data, error } = await supabase
          .from('events')
          .update({
            title: event.title,
            date: event.date,
            place: event.place,
            moderator: event.moderator || null,
            guest: event.guest || null,
            description: event.description || null,
          })
          .eq('id', event.id)
          .select()
          .single();

        if (error) {
          console.error('Update event error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Event updated:', data.id);
        return new Response(
          JSON.stringify({ success: true, event: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', event.id);

        if (error) {
          console.error('Delete event error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Event deleted:', event.id);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in admin-events:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});