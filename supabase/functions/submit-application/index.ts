/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// submit-application — public endpoint for the internal application form.
// ---------------------------------------------------------------------
// New flow (report items 1 & 2): the applicant creates their account AND
// their application in a single step. The client first calls
// supabase.auth.signUp (which sends the confirmation email and returns the
// still-unconfirmed user id), then calls THIS function with that user id +
// the application fields + documents. There is no separate "sign in first"
// step and no approval-pending step.
//
// A valid applicant is someone whose email is a @studbocconi.it address,
// who has not already applied in the current round, and who has completed
// all required fields. Such a person becomes a `candidate` immediately;
// confirming their email simply verifies the address.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DIVISIONS = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const YEARS = ['bachelor_1', 'bachelor_2', 'bachelor_3', 'master_1', 'master_2', 'exchange'];
const STUD_EMAIL = /@studbocconi\.it$/i;

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

    const form = await req.formData();
    const get = (k: string) => (form.get(k) as string | null)?.trim() ?? '';
    const userId = get('user_id');
    const cv = form.get('cv') as File | null;
    const answer = form.get('answer') as File | null;

    const fields = {
      first_name: get('first_name'), surname: get('surname'), bocconi_id: get('bocconi_id'),
      email: get('email'), phone: get('phone'), linkedin_url: get('linkedin_url'),
      degree_course: get('degree_course'), academic_year: get('academic_year'),
      first_choice: get('first_choice'), second_choice: get('second_choice'),
    };

    // ── Account link: the client has just signed up; verify that account. ──
    if (!userId) return json({ error: 'Missing account reference. Please retry the sign-up step.' }, 400);
    const { data: got, error: userErr } = await supabase.auth.admin.getUserById(userId);
    const account = got?.user;
    if (userErr || !account) return json({ error: 'We could not find your new account. Please retry.' }, 400);
    if ((account.email || '').toLowerCase() !== fields.email.toLowerCase()) {
      return json({ error: 'The email does not match your account. Please retry.' }, 400);
    }

    // ── Eligibility ──
    if (!STUD_EMAIL.test(fields.email)) {
      return json({ error: 'Applications require a @studbocconi.it email address.' }, 400);
    }
    // Existing members / staff cannot apply.
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const isStaffAlready = (roleRows || []).some(
      (r: { role: string }) => !['member', 'pending', 'candidate'].includes(r.role),
    );
    if (isStaffAlready) return json({ error: 'Members of the association cannot submit an application.' }, 403);

    // Applications open strictly by the scheduled window.
    const { data: settings } = await supabase
      .from('application_settings')
      .select('semester_label, start_date, end_date')
      .limit(1).single();
    const now = Date.now();
    const start = settings?.start_date ? new Date(settings.start_date).getTime() : null;
    const end = settings?.end_date ? new Date(settings.end_date).getTime() : null;
    if (start === null || end === null) return json({ error: 'Applications are currently closed.' }, 403);
    if (now < start) return json({ error: 'Applications have not opened yet.' }, 403);
    if (now > end) return json({ error: 'Applications have closed.' }, 403);
    const semester = settings!.semester_label as string;

    // One application per person per round (by account and by email).
    const { data: existingByUser } = await supabase.from('applications')
      .select('id').eq('user_id', userId).eq('semester_label', semester).maybeSingle();
    if (existingByUser) return json({ error: 'You have already submitted an application for this round.' }, 409);
    const { data: existingByEmail } = await supabase.from('applications')
      .select('id').ilike('email', fields.email).eq('semester_label', semester).maybeSingle();
    if (existingByEmail) return json({ error: 'An application with this email already exists for this round.' }, 409);

    // ── Field validation ──
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

    const cvPath = await uploadPdf(supabase, userId, 'cv', cv);
    const answerPath = await uploadPdf(supabase, userId, 'answer', answer);

    const { data: created, error: insErr } = await supabase.from('applications').insert({
      user_id: userId, semester_label: semester,
      first_name: fields.first_name, surname: fields.surname, bocconi_id: fields.bocconi_id,
      email: fields.email, phone: fields.phone, linkedin_url: fields.linkedin_url || null,
      degree_course: fields.degree_course, academic_year: fields.academic_year,
      cv_path: cvPath, answer_path: answerPath,
      first_choice: fields.first_choice, second_choice: fields.second_choice || null,
      status: 'received',
    }).select('id').single();
    if (insErr) throw insErr;

    // Restrict the account to candidate access (report 10.3). No approval step.
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('user_roles').insert({ user_id: userId, role: 'candidate', division: null });

    // Keep the account's display name in sync with the application.
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...(account.user_metadata || {}), full_name: `${fields.first_name} ${fields.surname}` },
    });

    return json({ success: true, id: created.id });
  } catch (error) {
    console.error('submit-application error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
