import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows, rolesOf } from '../_shared/access.ts';
import { readJsonObject, optionalTextOf, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { renderCertificate } from './pdf.ts';
import {
  boardSignatories, certificateFileName, ineligibility, newCode, normaliseCode, notOnRegister, roleLabel, semesterFromKey,
  semesterOf, semesterOrder, servedAsMember, type MemberRow, type Semester, type Signatory,
} from './rules.ts';
import { normaliseName } from '../_shared/member-match.ts';

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
//   register (Settings, Certificates: 'view')   every certificate issued
//   withdraw (Settings, Certificates: 'manage') withdraw one, with a reason
//   restore  (Settings, Certificates: 'manage') undo a withdrawal
//
// The register is the President's, the Admin's and the Vice President's
// (access matrix key `settings-certificates`). A withdrawn certificate
// reads "No longer valid" on the verification page, and its holder cannot
// download a replacement for the same role and semester: that would undo
// the withdrawal. A new role, or a new semester, is a new certificate.
//
// A certificate is for an ACTIVE member of the Society, in the role they
// hold now, for the current semester only: no history of roles or events.
//
// SINCE STEP 90:
//   * A FORMER MEMBER listed among the alumni can download a certificate of
//     the LAST semester they served (the role they held then, from the
//     semester's register), reading "was a member". It is signed by the
//     Board in office when it is issued.
//   * A certificate stays valid while its holder is a member or an alumnus.
//     Once they are neither (removed from Members without being moved to
//     Alumni), or expelled, it reads "No longer valid" on /verify, and the
//     register says why.
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
  holder_status?: 'member' | 'alumni' | null;
}

const CERT_COLUMNS = 'id, code, user_id, member_id, holder_name, role_label, semester_key, semester_label, board, issued_at, revoked_at, holder_status';

/** Where a certificate's holder stands today. */
type Standing = 'member' | 'alumni' | 'expelled' | 'left';

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/**
 * Where each holder stands today, for many certificates at once: on the
 * register (member), among the alumni, expelled, or neither ("left").
 * Alumni are recognised by the private address kept when they were moved
 * (alumni_contacts) matched against their account's address, or by their
 * name when exactly one alumnus carries it.
 */
async function standings(supabase: Db, certs: { id: string; user_id: string; member_id: string | null; holder_name: string }[]): Promise<Map<string, Standing>> {
  const out = new Map<string, Standing>();
  if (!certs.length) return out;
  const memberIds = [...new Set(certs.map((c) => c.member_id).filter(Boolean))] as string[];
  const userIds = [...new Set(certs.map((c) => c.user_id).filter(Boolean))] as string[];
  const byId = new Map<string, string>();
  const byUser = new Map<string, string>();
  const emailOf = new Map<string, string>();
  for (let i = 0; i < Math.max(memberIds.length, userIds.length); i += 200) {
    const ids = memberIds.slice(i, i + 200);
    const users = userIds.slice(i, i + 200);
    const [{ data: a }, { data: b }, { data: p }] = await Promise.all([
      ids.length ? supabase.from('members').select('id, membership_status').in('id', ids) : { data: [] },
      users.length ? supabase.from('members').select('user_id, membership_status').in('user_id', users) : { data: [] },
      users.length ? supabase.from('profiles').select('id, email').in('id', users) : { data: [] },
    ]);
    for (const x of (a || []) as { id: string; membership_status: string }[]) byId.set(x.id, x.membership_status);
    for (const x of (b || []) as { user_id: string; membership_status: string }[]) byUser.set(x.user_id, x.membership_status);
    for (const x of (p || []) as { id: string; email: string | null }[]) if (x.email) emailOf.set(x.id, x.email.trim().toLowerCase());
  }
  const [{ data: contacts }, { data: alumni }] = await Promise.all([
    supabase.from('alumni_contacts').select('alumni_id, email'),
    supabase.from('alumni').select('id, name, surname'),
  ]);
  const alumniIds = new Set(((alumni || []) as { id: string }[]).map((x) => x.id));
  const alumniEmails = new Set(((contacts || []) as { alumni_id: string; email: string | null }[])
    .filter((c) => c.email && alumniIds.has(c.alumni_id)).map((c) => c.email!.trim().toLowerCase()));
  const nameCount = new Map<string, number>();
  for (const x of (alumni || []) as { name: string | null; surname: string | null }[]) {
    const k = normaliseName(`${x.name ?? ''} ${x.surname ?? ''}`);
    if (k) nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
  }
  for (const c of certs) {
    const status = (c.member_id && byId.get(c.member_id)) || byUser.get(c.user_id);
    if (status) { out.set(c.id, status === 'expelled' ? 'expelled' : status === 'alumni' ? 'alumni' : 'member'); continue; }
    const email = emailOf.get(c.user_id);
    if (email && alumniEmails.has(email)) { out.set(c.id, 'alumni'); continue; }
    out.set(c.id, nameCount.get(normaliseName(c.holder_name)) === 1 ? 'alumni' : 'left');
  }
  return out;
}

/** The semester a certificate was issued in, for an alumni certificate's Board line. */
function issuedSemesterLabel(c: CertificateRow): string | undefined {
  if (c.holder_status !== 'alumni') return undefined;
  const at = c.issued_at && !Number.isNaN(Date.parse(c.issued_at)) ? new Date(c.issued_at) : new Date();
  return semesterOf(at).label;
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
        .select('id, code, user_id, holder_name, role_label, semester_label, issued_at, revoked_at, member_id')
        .eq('code', code).maybeSingle();
      if (!row) return json({ found: false, reason: 'unknown' });
      // Valid while the holder is a member or an alumnus, and not withdrawn.
      const standing = (await standings(supabase, [row])).get(row.id);
      const valid = !row.revoked_at && (standing === 'member' || standing === 'alumni');
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
    const roles = rolesOf(roleRows);
    audit.actor(user, roles);
    audit.request(action, {});

    // ── the register ─────────────────────────────────────────────────────
    if (action === 'register' || action === 'withdraw' || action === 'restore' || action === 'preview') {
      if (!allows(roles, user.email, 'settings-certificates', 'view')) return json({ error: 'Access denied' }, 403);
      const canManage = allows(roles, user.email, 'settings-certificates', 'manage');

      if (action === 'register') {
        const { data: rows, error } = await supabase.from('membership_certificates')
          .select('id, code, user_id, member_id, holder_name, role_label, semester_key, semester_label, issued_at, revoked_at, revoked_reason, revoked_by, holder_status')
          .order('issued_at', { ascending: false }).limit(3000);
        if (error) throw error;
        const list = (rows || []) as (CertificateRow & { revoked_reason: string | null; revoked_by: string | null })[];
        const standing = await standings(supabase, list);
        const revokers = [...new Set(list.map((r) => r.revoked_by).filter(Boolean))] as string[];
        const names = new Map<string, string>();
        if (revokers.length) {
          const { data: ps } = await supabase.from('members').select('user_id, first_name, surname').in('user_id', revokers);
          for (const x of (ps || []) as { user_id: string; first_name: string | null; surname: string | null }[]) {
            names.set(x.user_id, [x.first_name, x.surname].filter(Boolean).join(' '));
          }
        }
        return json({
          can_manage: canManage,
          certificates: list.map((r) => ({
            id: r.id, code: r.code, holder_name: r.holder_name, role_label: r.role_label,
            semester_key: r.semester_key, semester_label: r.semester_label, issued_at: r.issued_at,
            status: r.revoked_at ? 'withdrawn'
              : standing.get(r.id) === 'expelled' ? 'expelled'
              : standing.get(r.id) === 'left' ? 'left'
              : 'valid',
            holder_status: r.holder_status ?? 'member',
            // For a holder no longer on the register: the reason, as the register says it.
            left_reason: standing.get(r.id) === 'left' && !r.revoked_at ? notOnRegister(r.holder_name) : null,
            withdrawn_at: r.revoked_at, withdrawn_reason: r.revoked_reason,
            withdrawn_by: r.revoked_by ? (names.get(r.revoked_by) || 'A former officer') : null,
          })),
        });
      }

      // A preview is the certificate exactly as its holder downloads it:
      // drawn again from what was stored when it was issued, signatories
      // included. Reading it changes nothing, so it is not recorded.
      if (action === 'preview') {
        const pid = optionalTextOf(body, 'id');
        if (!pid) return json({ error: 'Choose a certificate.' }, 400);
        const { data: row } = await supabase.from('membership_certificates')
          .select(CERT_COLUMNS)
          .eq('id', pid).maybeSingle();
        if (!row) return json({ error: 'This certificate no longer exists. Reload the page.' }, 404);
        const c = row as CertificateRow;
        const pdf = await renderCertificate({
          code: c.code,
          holderName: c.holder_name,
          roleLabel: c.role_label,
          semesterLabel: c.semester_label,
          issuedAt: c.issued_at && !Number.isNaN(Date.parse(c.issued_at)) ? new Date(c.issued_at) : new Date(),
          board: Array.isArray(c.board) ? c.board : [],
          verifyUrl: `${SITE}/verify/${c.code}`,
          holderStatus: c.holder_status === 'alumni' ? 'alumni' : 'member',
          issuedSemesterLabel: issuedSemesterLabel(c),
        });
        return json({ file_name: certificateFileName(c.holder_name, c.semester_label), pdf: toBase64(pdf) });
      }

      if (!canManage) return json({ error: 'Only the President and the Vice President can withdraw or restore a certificate.' }, 403);
      const id = optionalTextOf(body, 'id');
      if (!id) return json({ error: 'Choose a certificate.' }, 400);
      const { data: cert } = await supabase.from('membership_certificates')
        .select('id, code, holder_name, revoked_at').eq('id', id).maybeSingle();
      if (!cert) return json({ error: 'This certificate no longer exists. Reload the page.' }, 404);

      if (action === 'withdraw') {
        const reason = (optionalTextOf(body, 'reason') || '').trim();
        if (reason.length < 3) return json({ error: 'Say why the certificate is withdrawn: the reason is kept in the register.' }, 400);
        if (reason.length > 300) return json({ error: 'Keep the reason under 300 characters.' }, 400);
        if (cert.revoked_at) return json({ error: 'This certificate is already withdrawn.' }, 409);
        const { error } = await supabase.from('membership_certificates')
          .update({ revoked_at: new Date().toISOString(), revoked_reason: reason, revoked_by: user.id }).eq('id', id);
        if (error) throw error;
        audit.subject(`Withdrawn: ${cert.holder_name} (${cert.code})`, id);
        return json({ success: true });
      }

      if (!cert.revoked_at) return json({ error: 'This certificate is not withdrawn.' }, 409);
      const { error } = await supabase.from('membership_certificates')
        .update({ revoked_at: null, revoked_reason: null, revoked_by: null }).eq('id', id);
      if (error) throw error;
      audit.subject(`Restored: ${cert.holder_name} (${cert.code})`, id);
      return json({ success: true });
    }

    const { data: member } = await supabase.from('members').select(MEMBER_COLUMNS).eq('user_id', user.id).maybeSingle();
    const m = (member || null) as MemberRow | null;

    // ── Which certificate this person can have ─────────────────────────
    // A member: the role they hold now, this semester (as before). Somebody
    // who is not, but is among the alumni: the last semester they served.
    let refusal = ineligibility(m);
    let semester: Semester = semesterOf();
    let role = m && !refusal ? roleLabel(m.role || '', m.division) : null;
    let holder = m ? `${(m.first_name || '').trim()} ${(m.surname || '').trim()}` : '';
    let holderStatus: 'member' | 'alumni' = 'member';

    const mayBeAlumnus = !m || m.membership_status === 'alumni'
      || ['advisor', 'silent_advisor', 'alumni'].includes((m.role || '').trim());
    if (refusal && mayBeAlumnus && m?.membership_status !== 'expelled' && (user.email || '').trim().toLowerCase() !== 'as.minerva@unibocconi.it') {
      const { data: prof } = await supabase.from('profiles').select('email, full_name').eq('id', user.id).maybeSingle();
      const emails = [...new Set([user.email, (prof as { email?: string } | null)?.email, m?.email]
        .map((e) => (e || '').trim().toLowerCase()).filter(Boolean))];
      // Among the alumni? By the private address kept when they were moved.
      let alumnus: { name: string | null; surname: string | null } | null = null;
      if (emails.length) {
        const { data: contacts } = await supabase.from('alumni_contacts').select('alumni_id, email');
        const hit = ((contacts || []) as { alumni_id: string; email: string | null }[])
          .find((c) => c.email && emails.includes(c.email.trim().toLowerCase()));
        if (hit) {
          const { data: al } = await supabase.from('alumni').select('name, surname').eq('id', hit.alumni_id).maybeSingle();
          alumnus = (al as { name: string | null; surname: string | null } | null) ?? null;
        }
      }
      if (alumnus || m?.membership_status === 'alumni') {
        // The last semester they served, from each semester's register.
        const { data: snaps } = await supabase.from('semester_members')
          .select('semester_key, semester_label, first_name, surname, email, role, division, member_id');
        const mine = ((snaps || []) as { semester_key: string; first_name: string | null; surname: string | null; email: string | null; role: string | null; division: string | null; member_id: string | null }[])
          .filter((r) => ((r.email && emails.includes(r.email.trim().toLowerCase())) || (m && r.member_id === m.id)) && servedAsMember(r.role))
          .sort((x, y) => semesterOrder(y.semester_key) - semesterOrder(x.semester_key));
        const last = mine[0];
        const sem = last ? semesterFromKey(last.semester_key) : null;
        if (last && sem) {
          semester = sem;
          role = roleLabel(last.role || '', last.division);
          holder = `${(alumnus?.name || last.first_name || '').trim()} ${(alumnus?.surname || last.surname || '').trim()}`.trim();
          holderStatus = 'alumni';
          refusal = holder ? null : 'Your name is incomplete in the alumni directory. The Head of Operations can correct it.';
        } else {
          refusal = 'There is no record of the semesters you served on the register, so no certificate can be issued yet. The Head of Operations can help.';
        }
      } else if (!m) {
        const display = ((prof as { full_name?: string } | null)?.full_name || '').trim() || (user.email || 'This account');
        refusal = notOnRegister(display);
      }
    }

    const current = async (): Promise<CertificateRow | null> => {
      if (!role) return null;
      const { data } = await supabase.from('membership_certificates')
        .select(CERT_COLUMNS)
        .eq('user_id', user.id).eq('semester_key', semester.key).eq('role_label', role).is('revoked_at', null)
        .order('issued_at', { ascending: false }).limit(1);
      return ((data || [])[0] as CertificateRow | undefined) ?? null;
    };

    // A certificate the Board withdrew for this role and semester is not
    // replaced by downloading again.
    const withdrawn = async (): Promise<boolean> => {
      if (!role) return false;
      const { data } = await supabase.from('membership_certificates')
        .select('id').eq('user_id', user.id).eq('semester_key', semester.key).eq('role_label', role)
        .not('revoked_at', 'is', null).limit(1);
      return (data || []).length > 0;
    };
    const WITHDRAWN = 'Your certificate for this role and semester has been withdrawn by the Board. For any question, write to as.minerva@unibocconi.it.';

    if (action === 'status') {
      const existing = refusal ? null : await current();
      const blocked = !refusal && !existing && await withdrawn();
      return json({
        eligible: !refusal && !blocked, reason: refusal || (blocked ? WITHDRAWN : null),
        semester_label: semester.label, role_label: refusal ? null : role,
        holder_status: holderStatus,
        withdrawn: blocked,
        certificate: existing ? summary(existing) : null,
      });
    }

    if (action === 'issue') {
      if (refusal || !role || !holder) return json({ error: refusal || 'No certificate can be issued for this account.' }, 403);
      let cert = await current();
      if (!cert && await withdrawn()) return json({ error: WITHDRAWN }, 403);
      if (!cert) {
        const { data: boardRows } = await supabase.from('members').select(MEMBER_COLUMNS).eq('membership_status', 'active');
        const board = boardSignatories((boardRows || []) as MemberRow[]);
        // A number is 40 random bits; a clash is astronomically unlikely,
        // and the unique index turns one into a retry rather than a mix-up.
        for (let attempt = 0; attempt < 4 && !cert; attempt++) {
          const code = newCode(semester, (n) => crypto.getRandomValues(new Uint8Array(n)));
          const { data, error } = await supabase.from('membership_certificates').insert({
            code, user_id: user.id, member_id: holderStatus === 'member' ? m!.id : null, holder_name: holder, role_label: role,
            semester_key: semester.key, semester_label: semester.label, board,
            issued_at: new Date().toISOString(), holder_status: holderStatus,
          }).select(CERT_COLUMNS).single();
          if (!error) cert = data as CertificateRow;
          else if (error.code !== '23505') throw error;
        }
        if (!cert) throw new Error('Could not allocate a certificate number');
      }
      audit.subject(`${cert.holder_name}, ${cert.semester_label} (${cert.code})`, cert.id);
      if (cert.holder_status === 'alumni') audit.note({ holder: 'alumni' });
      const pdf = await renderCertificate({
        code: cert.code,
        holderName: cert.holder_name,
        roleLabel: cert.role_label,
        semesterLabel: cert.semester_label,
        issuedAt: cert.issued_at && !Number.isNaN(Date.parse(cert.issued_at)) ? new Date(cert.issued_at) : new Date(),
        board: Array.isArray(cert.board) ? cert.board : [],
        verifyUrl: `${SITE}/verify/${cert.code}`,
        holderStatus: cert.holder_status === 'alumni' ? 'alumni' : 'member',
        issuedSemesterLabel: issuedSemesterLabel(cert),
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
