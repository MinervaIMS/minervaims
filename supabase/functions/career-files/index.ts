import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows, rolesOf } from '../_shared/access.ts';
import { readFileField, readTextField } from '../_shared/form-file.ts';
import { readJsonObject, optionalTextOf, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';

// =====================================================================
// career-files: the files of the Career section.
// ---------------------------------------------------------------------
//   list      (JSON)       the files of the requested kinds, each with a
//                          preview link valid one hour
//   download  (JSON)       a one-minute download link for one file. It is
//                          RECORDED in the activity log: the templates
//                          tell members that downloads are tracked, and
//                          this is the only way a download link is issued
//   upload    (multipart)  replace the CV or cover letter template or the
//                          portrait background, or add a wallpaper
//   rename    (JSON)       change a wallpaper's label
//   delete    (JSON)       remove a wallpaper, or a single-file kind
//
// The bucket is PRIVATE: the templates are for members only. Reading
// needs the Career subsection the file belongs to ('view'); changing it
// needs 'manage' there, which the access matrix gives the President, the
// Vice President and the Head of Operations (and the Admin).
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const BUCKET = 'career';
type Kind = 'cv_template' | 'cl_template' | 'portrait_background' | 'wallpaper';
const KINDS: Kind[] = ['cv_template', 'cl_template', 'portrait_background', 'wallpaper'];
const RESOURCE: Record<Kind, string> = {
  cv_template: 'career-cv',
  cl_template: 'career-cl',
  portrait_background: 'career-linkedin',
  wallpaper: 'career-linkedin',
};
/** One current file for these; wallpapers are a list. */
const SINGLE: Kind[] = ['cv_template', 'cl_template', 'portrait_background'];

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES: Record<Kind, number> = {
  cv_template: 10 * 1024 * 1024,
  cl_template: 10 * 1024 * 1024,
  portrait_background: 15 * 1024 * 1024,
  wallpaper: 15 * 1024 * 1024,
};

function isKind(v: unknown): v is Kind {
  return typeof v === 'string' && (KINDS as string[]).includes(v);
}
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';
}
/** What an upload must be, in words, for the refusal message. */
function acceptsText(kind: Kind): string {
  return kind === 'cv_template' || kind === 'cl_template'
    ? 'a Word document (.docx)'
    : 'an image (JPG, PNG or WebP)';
}
function typeAllowed(kind: Kind, file: File): boolean {
  const type = (file.type || '').toLowerCase();
  const name = file.name.toLowerCase();
  if (kind === 'cv_template' || kind === 'cl_template') {
    // Some browsers send .docx with an empty or generic type; the extension decides then.
    return name.endsWith('.docx') && (type === DOCX || type === '' || type === 'application/octet-stream' || type === 'application/zip');
  }
  return IMAGES.includes(type) && /\.(jpe?g|png|webp)$/.test(name);
}

interface Row {
  id: string; kind: Kind; label: string | null; file_path: string; file_name: string;
  mime_type: string | null; size_bytes: number | null; width: number | null; height: number | null;
  display_order: number; created_at: string; updated_at: string;
}

Deno.serve(audited('career-files', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = rolesOf(roleRows);
    audit.actor(user, roles);

    const canRead = (kind: Kind) => allows(roles, user.email, RESOURCE[kind], 'view');
    const canManage = (kind: Kind) => allows(roles, user.email, RESOURCE[kind], 'manage');
    if (!KINDS.some(canRead)) return json({ error: 'Access denied' }, 403);

    // ── upload (multipart) ───────────────────────────────────────────────
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const kind = readTextField(form, 'kind');
      audit.request('upload', { kind });
      if (!isKind(kind)) return json({ error: 'Choose where the file goes.' }, 400);
      if (!canManage(kind)) return json({ error: 'Only the President, the Vice President and the Head of Operations can change these files.' }, 403);
      const file = readFileField(form, 'file');
      if (!file) return json({ error: 'No file was received. Choose the file again.' }, 400);
      if (!typeAllowed(kind, file)) return json({ error: `This must be ${acceptsText(kind)}.` }, 400);
      if (file.size > MAX_BYTES[kind]) return json({ error: `The file must be under ${Math.round(MAX_BYTES[kind] / 1024 / 1024)} MB.` }, 400);
      const label = readTextField(form, 'label').slice(0, 120) || null;
      const width = Number(readTextField(form, 'width')) || null;
      const height = Number(readTextField(form, 'height')) || null;

      const path = `${kind}/${Date.now()}-${safeName(file.name)}`;
      const mime = kind === 'cv_template' || kind === 'cl_template' ? DOCX : file.type;
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, await file.arrayBuffer(), { contentType: mime, upsert: false });
      if (upErr) {
        console.error('career upload failed', upErr);
        return json({ error: 'The upload failed. Please try again.' }, 500);
      }

      const record = {
        kind, label, file_path: path, file_name: file.name.slice(-200), mime_type: mime,
        size_bytes: file.size, width, height, uploaded_by: user.id,
      };
      if (SINGLE.includes(kind)) {
        // REPLACE: the new file is recorded first, then the old one removed,
        // so a failure in between never leaves the page without a file.
        const { data: old } = await supabase.from('career_files').select('id, file_path').eq('kind', kind).maybeSingle();
        if (old) {
          const { error } = await supabase.from('career_files').update(record).eq('id', old.id);
          if (error) throw error;
          if (old.file_path !== path) await supabase.storage.from(BUCKET).remove([old.file_path]);
        } else {
          const { error } = await supabase.from('career_files').insert(record);
          if (error) throw error;
        }
      } else {
        const { data: last } = await supabase.from('career_files').select('display_order')
          .eq('kind', kind).order('display_order', { ascending: false }).limit(1).maybeSingle();
        const { error } = await supabase.from('career_files').insert({ ...record, display_order: (last?.display_order ?? 0) + 1 });
        if (error) throw error;
      }
      audit.subject(file.name);
      return json({ success: true });
    }

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);

    // ── list ─────────────────────────────────────────────────────────────
    if (action === 'list') {
      const asked = Array.isArray(body.kinds) ? body.kinds.filter(isKind) : KINDS;
      const kinds = (asked as Kind[]).filter(canRead);
      if (!kinds.length) return json({ files: [], can_manage: {} });
      const { data, error } = await supabase.from('career_files')
        .select('id, kind, label, file_path, file_name, mime_type, size_bytes, width, height, display_order, created_at, updated_at')
        .in('kind', kinds)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      const files = [];
      for (const r of (data || []) as Row[]) {
        // A viewing link only. Downloading asks for its own link below, so
        // that every download is recorded.
        const { data: view } = await supabase.storage.from(BUCKET).createSignedUrl(r.file_path, 3600);
        files.push({
          id: r.id, kind: r.kind, label: r.label, file_name: r.file_name, mime_type: r.mime_type,
          size_bytes: r.size_bytes, width: r.width, height: r.height, updated_at: r.updated_at,
          view_url: view?.signedUrl ?? null,
        });
      }
      const can_manage = Object.fromEntries(kinds.map((k) => [k, canManage(k)]));
      return json({ files, can_manage });
    }

    // ── download ─────────────────────────────────────────────────────────
    // Anyone who may read the file may download it; the audit wrapper
    // records who, what and when (MUTATES maps this action to 'download').
    if (action === 'download') {
      const id = optionalTextOf(body, 'id');
      if (!id) return json({ error: 'Choose a file.' }, 400);
      const { data: row } = await supabase.from('career_files').select('id, kind, file_path, file_name').eq('id', id).maybeSingle();
      if (!row) return json({ error: 'This file no longer exists. Reload the page.' }, 404);
      if (!canRead(row.kind as Kind)) return json({ error: 'Access denied' }, 403);
      audit.subject(row.file_name, row.id);
      const { data: signed, error } = await supabase.storage.from(BUCKET)
        .createSignedUrl(row.file_path, 60, { download: row.file_name });
      if (error || !signed?.signedUrl) {
        console.error('career download link failed', error);
        return json({ error: 'The download could not be prepared. Please try again.' }, 500);
      }
      return json({ url: signed.signedUrl, file_name: row.file_name });
    }

    // ── rename / delete ──────────────────────────────────────────────────
    if (action === 'rename' || action === 'delete') {
      const id = optionalTextOf(body, 'id');
      if (!id) return json({ error: 'Choose a file.' }, 400);
      const { data: row } = await supabase.from('career_files').select('id, kind, file_path, file_name').eq('id', id).maybeSingle();
      if (!row) return json({ error: 'This file no longer exists. Reload the page.' }, 404);
      if (!canManage(row.kind as Kind)) return json({ error: 'Only the President, the Vice President and the Head of Operations can change these files.' }, 403);
      audit.subject(row.file_name, row.id);
      if (action === 'rename') {
        const label = (optionalTextOf(body, 'label') || '').slice(0, 120) || null;
        const { error } = await supabase.from('career_files').update({ label }).eq('id', id);
        if (error) throw error;
        return json({ success: true });
      }
      const { error } = await supabase.from('career_files').delete().eq('id', id);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([row.file_path]);
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('career-files error:', error);
    return json({ error: 'Something went wrong with the Career files. Please try again.' }, 500);
  }
}));
