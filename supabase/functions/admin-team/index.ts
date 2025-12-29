import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Validation schemas
const TeamMemberSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  surname: z.string().min(1, 'Surname is required').max(100, 'Surname too long').trim(),
  position: z.enum([
    'President',
    'Vice President',
    'Head of Asset Management',
    'Head of Equity Research',
    'Head of Investment Research',
    'Head of Macro Research',
    'Head of Portfolio Management',
    'Head of Quantitative Research',
    'Portfolio Manager',
    'Senior Analyst',
    'Analyst',
    'Head of Operations',
    'Head of Media',
    'Operations',
    'Media',
    'Co-Head of Equity Research',
    'Co-Head of Investment Research',
    'Co-Head of Macro Research',
    'Co-Head of Portfolio Management',
    'Co-Head of Quantitative Research',
    'Co-Head of Operations',
    'Co-Head of Media',
  ]),
  division: z.enum(['equity', 'investment', 'macro', 'portfolio', 'quant', 'operations']).nullable().optional(),
  fund: z.enum(['long-short', 'multi-asset', 'dps', 'pir']).nullable().optional(),
  photo_url: z.string().max(500, 'Photo URL too long').nullable().optional()
    .refine((val) => !val || val === '' || val.startsWith('https://') || val.startsWith('http://'), 
      'Photo URL must be a valid URL'),
  linkedin_url: z.string().max(500, 'LinkedIn URL too long').nullable().optional()
    .refine((val) => !val || val === '' || val.startsWith('https://') || val.startsWith('http://'), 
      'LinkedIn URL must be a valid URL'),
  is_board: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

// For delete operations, only id is required
const DeleteMemberSchema = z.object({
  id: z.string().uuid('Valid member ID is required'),
});

const ActionSchema = z.enum(['create', 'update', 'delete']);

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Verify user with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const isAdmin = user.email === 'as.minerva@unibocconi.it';
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!isAdmin && !adminRole) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    
    // Validate action
    const actionResult = ActionSchema.safeParse(body.action);
    if (!actionResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid action', details: actionResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const action = actionResult.data;

    // Validate member data based on action
    if (action === 'delete') {
      // For delete, only validate id
      const deleteResult = DeleteMemberSchema.safeParse(body.member);
      if (!deleteResult.success) {
        console.error('Validation error:', deleteResult.error.format());
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: deleteResult.error.format() }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin ${user.email} performing action: ${action}`);

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', deleteResult.data.id);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For create/update, validate full member data
    const memberResult = TeamMemberSchema.safeParse(body.member);
    if (!memberResult.success) {
      console.error('Validation error:', memberResult.error.format());
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: memberResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const member = memberResult.data;

    console.log(`Admin ${user.email} performing action: ${action}`);

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
      if (!member.id) {
        return new Response(
          JSON.stringify({ error: 'Member ID is required for update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
