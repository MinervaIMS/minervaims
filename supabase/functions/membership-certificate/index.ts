import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { rolesOf } from '../_shared/access.ts';
import { readJsonObject, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { renderCertificate } from './pdf.ts';
import {
  boardSignatories, certificateFileName, ineligibility, newCode, normaliseCode, roleLabel, semesterOf,
  type MemberRow, type Signatory,
} from './rules.ts';

// =====================================================================
// membership-certificate: the verified certificate of membership.
// ---------------------------------------------------------------------
//   status   (member)   whether the reader can have one this semester,
//                       and the one they already have, if any
//   issue    (member)   the PDF of the reader's certificate for the
//                       current semester and role: the existing one if
//                       they already have it, a new one otherwise.
//                       RECORDED in the activity log
//   verify   (anyone)   what a certificate number certifies: name, role,
//                       semester, issue date and whether it is valid.
//                       No account needed, nothing else disclosed
//
// A certificate is for an ACTIVE member of the Society, in the role they
// hold now, for the current semester only: no history of roles or events.
// It is signed by the President and the Vice President in office when it
// is issued, on behalf of the Board of Directors of the semester, and
// everything on it is stored with it, so it reads the same every time it
// is downloaded. See migration 20260927100100_membership_certificates.sql.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const SITE = 'https://minervaims.org';
const MEMBER_COLUMNS = 'id, first_name, surname, email, role, division, membership_status';

interface CertificateRow {
  id: string; code: string; user_id: string; member_id: string | null; holder_name: string; role_label: string;
  semester_key: string; semester_label: string; board: Signatory[]; issued_at: string; revoked_at: string | null;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(bin);
}

function summary(c: CertificateRow) {
  return { code: c.code, holder_name: c.holder_name, role_label: c.role_label, semester_label: c.semester_label, issued_at: c.issued_at };
}

Deno.serve(audited('membership-certificate', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';

    // ── verify: public ───────────────────────────────────────────────────
    if (action === 'verify') {
      const code = normaliseCode(body.code);
      if (!code) return json({ found: false, reason: 'format' });
      const { data: row } = await supabase.from('membership_certificates')
        .select('code, holder_name, role_label, semester_label, issued_at, revoked_at, member_id')
        .eq('code', code).maybeSingle();
      if (!row) return json({ found: false, reason: 'unknown' });
      let expelled = false;
      if (row.member_id) {
        const { data: m } = await supabase.from('members').select('membership_status').eq('id', row.member_id).maybeSingle();
        expelled = m?.membership_status === 'expelled';
      }
      const valid = !row.revoked_at && !expelled;
      return json({
        found: true, valid,
        code: row.code, holder_name: row.holder_name, role_label: row.role_label,
        semester_label: row.semester_label, issued_at: row.issued_at,
      });
    }

    // ── everything else: the member themselves ───────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    audit.actor(user, rolesOf(roleRows));
    audit.request(action, {});

    const { data: member } = await supabase.from('members').select(MEMBER_COLUMNS).eq('user_id', user.id).maybeSingle();
    const m = (member || null) as MemberRow | null;
    const refusal = ineligibility(m);
    const semester = semesterOf();
    const role = m ? roleLabel(m.role || '', m.division) : null;

    const current = async (): Promise<CertificateRow | null> => {
      if (!m || !role) return null;
      const { data } = await supabase.from('membership_certificates')
        .select('id, code, user_id, member_id, holder_name, role_label, semester_key, semester_label, board, issued_at, revoked_at')
        .eq('user_id', user.id).eq('semester_key', semester.key).eq('role_label', role).is('revoked_at', null)
        .order('issued_at', { ascending: false }).limit(1);
      return ((data || [])[0] as CertificateRow | undefined) ?? null;
    };

    if (action === 'status') {
      const existing = refusal ? null : await current();
      return json({
        eligible: !refusal, reason: refusal,
        semester_label: semester.label, role_label: refusal ? null : role,
        certificate: existing ? summary(existing) : null,
      });
    }

    if (action === 'issue') {
      if (refusal || !m || !role) return json({ error: refusal || 'No certificate can be issued for this account.' }, 403);
      let cert = await current();
      if (!cert) {
        const { data: boardRows } = await supabase.from('members').select(MEMBER_COLUMNS).eq('membership_status', 'active');
        const board = boardSignatories((boardRows || []) as MemberRow[]);
        const holder = `${(m.first_name || '').trim()} ${(m.surname || '').trim()}`;
        // A number is 40 random bits; a clash is astronomically unlikely,
        // and the unique index turns one into a retry rather than a mix-up.
        for (let attempt = 0; attempt < 4 && !cert; attempt++) {
          const code = newCode(semester, (n) => crypto.getRandomValues(new Uint8Array(n)));
          const { data, error } = await supabase.from('membership_certificates').insert({
            code, user_id: user.id, member_id: m.id, holder_name: holder, role_label: role,
            semester_key: semester.key, semester_label: semester.label, board,
            issued_at: new Date().toISOString(),
          }).select('id, code, user_id, member_id, holder_name, role_label, semester_key, semester_label, board, issued_at, revoked_at').single();
          if (!error) cert = data as CertificateRow;
          else if (error.code !== '23505') throw error;
        }
        if (!cert) throw new Error('Could not allocate a certificate number');
      }
      audit.subject(`${cert.holder_name}, ${cert.semester_label} (${cert.code})`, cert.id);
      const pdf = await renderCertificate({
        code: cert.code,
        holderName: cert.holder_name,
        roleLabel: cert.role_label,
        semesterLabel: cert.semester_label,
        issuedAt: cert.issued_at && !Number.isNaN(Date.parse(cert.issued_at)) ? new Date(cert.issued_at) : new Date(),
        board: Array.isArray(cert.board) ? cert.board : [],
        verifyUrl: `${SITE}/verify/${cert.code}`,
      });
      return json({
        certificate: summary(cert),
        file_name: certificateFileName(cert.holder_name, cert.semester_label),
        pdf: toBase64(pdf),
      });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('membership-certificate error:', error);
    return json({ error: 'The certificate could not be prepared. Please try again.' }, 500);
  }
}));
