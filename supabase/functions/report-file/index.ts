/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// report-file — serve a published report under its own TITLE.
// ---------------------------------------------------------------------
// Storage objects are named after their upload key ("1740…-a91f.pdf"),
// and a browser names a download after the URL's last path segment or
// the Content-Disposition header, never after anything the page knows.
// That is why a report opened full screen and saved with the viewer's
// own download button used to land on disk as a random key, and why the
// mobile preview tab showed an opaque URL instead of the report.
//
// This endpoint streams the stored file back with the report's real
// title in BOTH channels the browser looks at:
//   * Content-Disposition: inline (or attachment) + filename + filename*
//   * a URL whose trailing path segment is already "<Title>.pdf"
// so every viewer, on every platform, names it correctly.
//
//   GET /report-file/<Any Title>.pdf?id=<archive_file_id>[&download=1]
//
// Only published rows are served, so this cannot be used to reach drafts.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'content-length, content-range, content-disposition',
};

/** RFC 5987 encoding for the filename* parameter. */
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value)
    .replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%(7C|60|5E)/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** A file-system-safe rendering of the report title (ASCII fallback). */
function safeName(title: string): string {
  const cleaned = String(title || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Report';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const forceDownload = url.searchParams.get('download') === '1';
    if (!id) {
      return new Response('Missing report id', { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: file, error } = await supabase
      .from('archive_files')
      .select('title, file_url, status')
      .eq('id', id)
      .maybeSingle();

    if (error || !file || file.status !== 'published' || !file.file_url) {
      return new Response('Report not found', { status: 404, headers: corsHeaders });
    }

    // Stream the stored object straight through, forwarding Range so the
    // PDF viewers that fetch page by page keep working.
    const range = req.headers.get('range');
    const upstream = await fetch(file.file_url, range ? { headers: { range } } : undefined);
    if (!upstream.ok && upstream.status !== 206) {
      return new Response('Report unavailable', { status: 502, headers: corsHeaders });
    }

    const ascii = safeName(file.title) + '.pdf';
    const disposition =
      `${forceDownload ? 'attachment' : 'inline'}; ` +
      `filename="${ascii.replace(/"/g, '')}"; ` +
      `filename*=UTF-8''${encodeRfc5987(ascii)}`;

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/pdf');
    headers.set('Content-Disposition', disposition);
    headers.set('Cache-Control', 'public, max-age=3600');
    const len = upstream.headers.get('content-length');
    if (len) headers.set('Content-Length', len);
    const cr = upstream.headers.get('content-range');
    if (cr) headers.set('Content-Range', cr);
    headers.set('Accept-Ranges', 'bytes');

    return new Response(req.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (e) {
    console.error('report-file error:', e);
    return new Response('Unexpected error', { status: 500, headers: corsHeaders });
  }
});
