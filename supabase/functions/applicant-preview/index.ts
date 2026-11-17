// =====================================================================
// applicant-preview: the emails an applicant receives, filled for a
// SAMPLE applicant (Step 106, Recruiting, Applicant Preview).
// ---------------------------------------------------------------------
// It reads the stored copy of each applicant email (auto_email_templates,
// the copy the database actually sends) and fills it the way the database
// does, with the sample values of _shared/applicant-preview.ts, then
// derives the plain-text part with the same converter as every email.
//
// WHO: anybody who can open Candidates Screening, at any level (the same
// matrix the navigation uses, _shared/access.ts). Nothing else is read:
// no applicant, no address, no booking. NOTHING IS SENT AND NOTHING IS
// WRITTEN; the answer is the emails, as data, for the page to draw.
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { allows, rolesOf } from '../_shared/access.ts';
import { emailText } from '../_shared/email-text.ts';
import {
  APPLICANT_EMAIL_KEYS, fillTemplate, sampleCallCalendarBlock, sampleVars,
} from '../_shared/applicant-preview.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const ADMIN_EMAIL = 'as.minerva@unibocconi.it';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    if (!allows(rolesOf(roleRows), user.email, 'applications-screening', 'view')) {
      return json({ error: 'Applicant Preview is open to the roles that can open Candidates Screening.' }, 403);
    }

    // The sitting President signs every offer: their name, as the offer
    // email is sent with it (admin-applications), never the association account.
    let presidentName = 'The President';
    try {
      const { data: pres } = await supabase.from('members')
        .select('first_name, surname, email').eq('role', 'president').eq('membership_status', 'active');
      // deno-lint-ignore no-explicit-any
      const real = (pres || []).find((m: any) => String(m.email || '').toLowerCase() !== ADMIN_EMAIL);
      if (real) presidentName = `${real.first_name} ${real.surname}`.trim();
    } catch { /* the placeholder signature is enough for a preview */ }

    const { data: rows, error } = await supabase
      .from('auto_email_templates')
      .select('key, name, subject, body, connected')
      .in('key', [...APPLICANT_EMAIL_KEYS]);
    if (error) return json({ error: 'The emails could not be read just now.' }, 500);

    const vars = sampleVars({ supabaseUrl, presidentName });
    const callVars = { ...vars, calendar_block: sampleCallCalendarBlock(supabaseUrl) };
    // deno-lint-ignore no-explicit-any
    const byKey = new Map((rows || []).map((r: any) => [r.key, r]));
    const emails = APPLICANT_EMAIL_KEYS.map((key) => {
      // deno-lint-ignore no-explicit-any
      const r: any = byKey.get(key);
      if (!r) return { key, missing: true };
      const v = key.startsWith('call_') ? callVars : vars;
      const html = fillTemplate(String(r.body || ''), v);
      return {
        key,
        name: r.name,
        connected: r.connected === true,
        subject: fillTemplate(String(r.subject || ''), v),
        html,
        text: emailText(html),
      };
    });
    return json({ emails, sample: { first_name: vars.first_name, division_name: vars.division_name } });
  } catch (e) {
    console.error('applicant-preview failed', e);
    return json({ error: 'The preview could not be prepared just now.' }, 500);
  }
});
