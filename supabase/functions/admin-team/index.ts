import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Create HMAC key for JWT verification
async function getJwtKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (limit.count >= 30) return false;
  limit.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];

    // Properly verify JWT token with cryptographic signature verification
    let payload: { sub?: string; exp?: number };
    try {
      const key = await getJwtKey();
      payload = await verify(token, key) as { sub?: string; exp?: number };
      
      if (!payload.sub) {
        throw new Error('Invalid token payload');
      }
      
      // Check expiration (djwt does this automatically, but explicit check is fine)
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return new Response(
          JSON.stringify({ error: 'Token expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin still exists in database
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', payload.sub)
      .maybeSingle();

    if (!admin) {
      console.error('Admin not found for sub:', payload.sub);
      return new Response(
        JSON.stringify({ error: 'Invalid admin' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, member } = body;

    console.log(`Admin ${payload.sub} performing action: ${action}`);

    if (action === 'create') {
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          name: member.name,
          surname: member.surname,
          position: member.position,
          division: member.division || null,
          fund: member.fund || null,
          photo_url: member.photo_url || null,
          linkedin_url: member.linkedin_url || null,
          is_board: member.is_board || false,
          display_order: member.display_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, member: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      const { data, error } = await supabase
        .from('team_members')
        .update({
          name: member.name,
          surname: member.surname,
          position: member.position,
          division: member.division || null,
          fund: member.fund || null,
          photo_url: member.photo_url || null,
          linkedin_url: member.linkedin_url || null,
          is_board: member.is_board || false,
          display_order: member.display_order || 0,
        })
        .eq('id', member.id)
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, member: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
