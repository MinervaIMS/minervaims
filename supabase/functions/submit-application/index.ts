/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// submit-application — public endpoint for the internal application form.
//   * requires the applicant to be logged in (Bearer token).
//   * only works while applications are open.
//   * one application per user per semester; locked after submission.
//   * uploads CV + PDF answer to the private `applications` bucket.
//   * sets the applicant's role to `candidate` (restricted access).
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DIVISIONS = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const YEARS = ['bachelor_1', 'bachelor_2', 'bachelor_3', 'master_1', 'master_2', 'exchange'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function uploadPdf(supabase: any, userId: string, kind: string, file: File): Promise<string> {
  const path = `${userId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  const buf = await file.arrayBuffer();
  const { error } = await supabase.storage.from('applications').upload(path, buf, {
    contentType: 'application/pdf', upsert: false,
  });
  if (error) throw new Error(`Failed to upload ${kind}: ${error.message}`);
  return path;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'You must be signed in to apply.' }, 401);
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid session. Please sign in again.' }, 401);

    // Existing members / staff cannot apply (and must not be demoted).
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isStaffAlready = (roleRows || []).some(
      (r: { role: string }) => !['member', 'pending', 'candidate'].includes(r.role),
    );
    if (isStaffAlready) return json({ error: 'Members of the association cannot submit an application.' }, 403);

    // Applications must be open.
    const { data: settings } = await supabase
      .from('application_settings')
      .select('applications_open, semester_label, start_date, end_date')
      .limit(1).single();
    if (!settings?.applications_open) return json({ error: 'Applications are currently closed.' }, 403);
    const now = Date.now();
    if (settings.start_date && now < new Date(settings.start_date).getTime()) return json({ error: 'Applications have not opened yet.' }, 403);
    if (settings.end_date && now > new Date(settings.end_date).getTime()) return json({ error: 'Applications have closed.' }, 403);
    const semester = settings.semester_label as string;

    // Must not already exist for this semester (locked after submission).
    const { data: existing } = await supabase.from('applications')
      .select('id').eq('user_id', user.id).eq('semester_label', semester).maybeSingle();
    if (existing) return json({ error: 'You have already submitted an application for this round.' }, 409);

    const form = await req.formData();
    const get = (k: string) => (form.get(k) as string | null)?.trim() ?? '';
    const cv = form.get('cv') as File | null;
    const answer = form.get('answer') as File | null;

    const fields = {
      first_name: get('first_name'), surname: get('surname'), bocconi_id: get('bocconi_id'),
      email: get('email'), phone: get('phone'), linkedin_url: get('linkedin_url'),
      degree_course: get('degree_course'), academic_year: get('academic_year'),
      first_choice: get('first_choice'), second_choice: get('second_choice'),
    };

    // Validation
    const required: [string, string][] = [
      ['first_name', fields.first_name], ['surname', fields.surname], ['bocconi_id', fields.bocconi_id],
      ['email', fields.email], ['phone', fields.phone], ['degree_course', fields.degree_course],
      ['academic_year', fields.academic_year], ['first_choice', fields.first_choice],
    ];
    for (const [k, v] of required) if (!v) return json({ error: `Missing required field: ${k}` }, 400);
    if (!YEARS.includes(fields.academic_year)) return json({ error: 'Invalid academic year.' }, 400);
    if (!DIVISIONS.includes(fields.first_choice)) return json({ error: 'Invalid first-choice division.' }, 400);
    if (fields.second_choice && !DIVISIONS.includes(fields.second_choice)) return json({ error: 'Invalid second-choice division.' }, 400);
    if (fields.second_choice && fields.second_choice === fields.first_choice) return json({ error: 'Choose two different divisions.' }, 400);
    if (!cv) return json({ error: 'Please attach your CV (PDF).' }, 400);
    if (!answer) return json({ error: 'Please attach your written answer (PDF).' }, 400);
    for (const [label, f] of [['CV', cv], ['answer', answer]] as [string, File][]) {
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return json({ error: `${label} must be a PDF.` }, 400);
      if (f.size > 10 * 1024 * 1024) return json({ error: `${label} must be under 10 MB.` }, 400);
    }

    const cvPath = await uploadPdf(supabase, user.id, 'cv', cv);
    const answerPath = await uploadPdf(supabase, user.id, 'answer', answer);

    const { data: created, error: insErr } = await supabase.from('applications').insert({
      user_id: user.id, semester_label: semester,
      first_name: fields.first_name, surname: fields.surname, bocconi_id: fields.bocconi_id,
      email: fields.email, phone: fields.phone, linkedin_url: fields.linkedin_url || null,
      degree_course: fields.degree_course, academic_year: fields.academic_year,
      cv_path: cvPath, answer_path: answerPath,
      first_choice: fields.first_choice, second_choice: fields.second_choice || null,
      status: 'received',
    }).select('id').single();
    if (insErr) throw insErr;

    // Restrict the account to candidate access (report 10.3 / Q4).
    await supabase.from('user_roles').delete().eq('user_id', user.id);
    await supabase.from('user_roles').insert({ user_id: user.id, role: 'candidate', division: null });

    return json({ success: true, id: created.id });
  } catch (error) {
    console.error('submit-application error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
