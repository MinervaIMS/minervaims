import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows, rolesOf } from '../_shared/access.ts';
import { readJsonObject, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';

// =====================================================================
// brand-kit: the design system package, whole, for Brand & Design.
// ---------------------------------------------------------------------
//   status      (view)    what is there: file name, size, last update
//   download    (view)    a one-minute link to the ZIP. RECORDED in the
//                         activity log
//   upload-url  (manage)  a one-time link the page sends a new ZIP to,
//                         replacing the current one. RECORDED
//
// The package is PRIVATE. It carries the Society's artwork, templates and
// the Times New Roman font files, which are licensed and must not be put
// on a public address; members reach it only through a signed link, and
// only from the Brand & Design page (`smm-brand`). Replacing it needs
// full access there: the Head of Media and Communication, the President,
// the Vice President and the Admin.
//
// The upload does not pass through this function: a package is larger than
// a function should carry, so the page sends it straight to storage with a
// signed upload link issued here, after the permission check.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const BUCKET = 'brand-kit';
const FOLDER = 'design-system';
const FILE = 'Minerva_IMS_Design_System.zip';
const PATH = `${FOLDER}/${FILE}`;
const RESOURCE = 'smm-brand';

Deno.serve(audited('brand-kit', async (req, audit) => {
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
    if (!allows(roles, user.email, RESOURCE, 'view')) return json({ error: 'Access denied' }, 403);
    const canManage = allows(roles, user.email, RESOURCE, 'manage');

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, {});

    const current = async () => {
      const { data } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: 10 });
      const obj = (data || []).find((o: { name: string }) => o.name === FILE) as
        { name: string; updated_at?: string; created_at?: string; metadata?: { size?: number } } | undefined;
      return obj ? { file_name: FILE, size_bytes: obj.metadata?.size ?? null, updated_at: obj.updated_at ?? obj.created_at ?? null } : null;
    };

    if (action === 'status') {
      return json({ package: await current(), can_manage: canManage });
    }

    if (action === 'download') {
      const pkg = await current();
      if (!pkg) return json({ error: 'The design system package has not been uploaded yet.' }, 404);
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(PATH, 60, { download: FILE });
      if (error || !data) throw error ?? new Error('No link');
      audit.subject('Design system package', null);
      return json({ url: data.signedUrl, file_name: FILE });
    }

    if (action === 'upload-url') {
      if (!canManage) return json({ error: 'Only the Head of Media and Communication, the President and the Vice President can replace the package.' }, 403);
      // The bucket is created on first use if the migration that makes it
      // has not run: private, like everything the workspace keeps.
      const { error: bucketErr } = await supabase.storage.getBucket(BUCKET);
      if (bucketErr) {
        const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: false });
        if (createErr && !/already exists/i.test(createErr.message)) throw createErr;
      }
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(PATH, { upsert: true });
      if (error || !data) throw error ?? new Error('No upload link');
      audit.subject('Design system package', null);
      return json({ bucket: BUCKET, path: data.path ?? PATH, token: data.token });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('brand-kit error:', error);
    return json({ error: 'The design system package could not be reached. Please try again.' }, 500);
  }
}));
