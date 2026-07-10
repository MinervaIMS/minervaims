/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { LEGACY_KEYS_TO_DISCONNECT, TRANSACTIONAL_TEMPLATES } from '../_shared/transactional-emails.ts';
import { normalizeEmailSubject } from '../_shared/email-subjects.ts';
import { normalizeEmailLinks } from '../_shared/email-links.ts';

// =====================================================================
// admin-auto-emails — automatic-email templates + the register of emails
// the system has sent (read from email_send_log). (report 12.6)
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
const MANAGE = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations'];
const LEGACY_KEYS = new Set(LEGACY_KEYS_TO_DISCONNECT);

// Allowlist of upload types (see admin-resources): reject HTML/SVG/scripts.
const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv', 'application/zip',
  'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const BLOCKED_EXT = /\.(html?|xhtml|svg|js|mjs|php|sh|exe|bat|htm)$/i;
function fileTypeAllowed(file: File): boolean {
  if (BLOCKED_EXT.test(file.name)) return false;
  return ALLOWED_MIME.has((file.type || '').toLowerCase());
}
function objectPath(fileUrlOrPath: string): string {
  const marker = '/workspace-resources/';
  const i = fileUrlOrPath.indexOf(marker);
  return i >= 0 ? fileUrlOrPath.slice(i + marker.length) : fileUrlOrPath;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: any) => r.role);
    const canManage = user.email === 'as.minerva@unibocconi.it' || roles.some((r: string) => MANAGE.includes(r));
    if (!canManage) return json({ error: 'Access denied' }, 403);

    // File upload (multipart) for the email layout — reuses the public bucket.
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (!file) return json({ error: 'No file provided' }, 400);
      if (file.size > 25 * 1024 * 1024) return json({ error: 'File must be under 25 MB.' }, 400);
      const safe = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `auto-emails/${Date.now()}-${safe}`;
      const { data: up, error: upErr } = await supabase.storage.from('workspace-resources')
        .upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
      if (upErr) return json({ error: 'Upload failed' }, 500);
      return json({ success: true, file_url: up.path });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'sign') {
      const p = objectPath(String(body.file_url || ''));
      if (!p) return json({ error: 'No file' }, 400);
      const { data, error } = await supabase.storage.from('workspace-resources').createSignedUrl(p, 60 * 60);
      if (error || !data) return json({ error: 'Could not open the file.' }, 500);
      return json({ url: data.signedUrl });
    }

    if (action === 'list') {
      const { data: templates } = await supabase.from('auto_email_templates').select('*').order('name');
      const rowsByKey = new Map((templates || []).map((template: any) => [template.key, template]));
      const codeTemplates = TRANSACTIONAL_TEMPLATES.map((template) => {
        const row = rowsByKey.get(template.key) as any | undefined;
        rowsByKey.delete(template.key);
        return {
          ...(row || {}),
          id: row?.id || `code-${template.key}`,
          key: template.key,
          name: template.name,
          subject: normalizeEmailSubject(template.subject),
          body: normalizeEmailLinks(template.body),
          description: row?.description ?? null,
          file_url: row?.file_url ?? null,
          connected: row?.connected ?? !LEGACY_KEYS.has(template.key),
          updated_at: row?.updated_at ?? new Date(0).toISOString(),
          trigger_description: row?.trigger_description ?? null,
          recipient_description: row?.recipient_description ?? null,
          schedule_description: row?.schedule_description ?? null,
        };
      });
      const mergedTemplates = [...codeTemplates, ...rowsByKey.values()].sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
      let log: any[] = [];
      try {
        const { data } = await supabase.from('email_send_log')
          .select('id, template_name, recipient_email, status, created_at').order('created_at', { ascending: false }).limit(200);
        log = data || [];
      } catch { /* email_send_log optional */ }
      return json({ templates: mergedTemplates, log });
    }

    if (action === 'save-template') {
      const t = body.template || {};
      if (!t.id) return json({ error: 'Missing template id' }, 400);
      const patch: Record<string, unknown> = { subject: t.subject ?? '', body: t.body ?? '', description: t.description ?? null, updated_by: user.id };
      if ('file_url' in t) patch.file_url = t.file_url ?? null;
      if ('name' in t && t.name) patch.name = t.name;
      const { error } = await supabase.from('auto_email_templates').update(patch).eq('id', t.id);
      if (error) throw error;
      return json({ success: true });
    }

    // Add a new custom template. It starts as "not connected" (red) until it
    // is wired into an automated flow.
    if (action === 'create-template') {
      const t = body.template || {};
      const name = (t.name as string || '').trim();
      if (!name) return json({ error: 'A title is required' }, 400);
      const key = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}_${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from('auto_email_templates').insert({
        key, name, description: t.description ?? null, file_url: t.file_url ?? null,
        subject: t.subject ?? '', body: t.body ?? '', connected: false, updated_by: user.id,
      }).select().single();
      if (error) throw error;
      return json({ success: true, template: data });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-auto-emails error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
