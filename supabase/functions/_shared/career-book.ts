// =====================================================================
// career-book.ts: a book of the Career section that members download as
// their own copy (Step 101, for the guides of Career > IB Questions).
// ---------------------------------------------------------------------
// It follows the greenbook of Career > Brainteasers step by step (see
// career-brainteasers/index.ts, left as it is):
//
//   download    the PDF with the reader's name, email and the date on
//               every page and a notice on the cover, recorded, at most
//               perDay copies a day (the President and the admin account
//               are not counted)
//   uploadUrl   a one-time link the page uploads a new PDF to
//   commit      the check that the upload is a usable PDF, by
//               watermarking it once exactly as every download will; it
//               then replaces the old one
//   remove      the book goes; copies already downloaded are not affected
//               and the register is kept
//   register    who has downloaded it, newest first
//
// One row per book in career_files (its own kind); the file in the
// private bucket career-library; every download in career_book_downloads.
// =====================================================================

// deno-lint-ignore-file no-explicit-any
import { printable, watermarkPdf } from './pdf-watermark.ts';

export const BOOK_BUCKET = 'career-library';
export const BOOK_MAX_PDF = 60 * 1024 * 1024;

export interface BookSpec {
  /** career_files.kind, and career_book_downloads.kind. */
  kind: string;
  /** Where uploads go in the bucket: "<folder>/<time>-<random>.pdf". */
  folder: string;
  /** The title used when none is given at upload. */
  defaultTitle: string;
  /** Downloads a reader may take in 24 hours. */
  perDay: number;
}

export interface BookRow { id: string; label: string | null; file_path: string; file_name: string; size_bytes: number | null; width: number | null; updated_at: string }
export interface BookOut { id: string; title: string | null; file_name: string; size_bytes: number | null; pages: number | null; updated_at: string }

/** "9 October 2026", on Rome's calendar. */
export function romeDay(d = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function bookOut(g: BookRow | null): BookOut | null {
  return g ? { id: g.id, title: g.label, file_name: g.file_name, size_bytes: g.size_bytes, pages: g.width, updated_at: g.updated_at } : null;
}

export async function bookRow(supabase: any, spec: BookSpec): Promise<BookRow | null> {
  const { data } = await supabase.from('career_files')
    .select('id, label, file_path, file_name, size_bytes, width, updated_at').eq('kind', spec.kind).maybeSingle();
  return (data as BookRow | null) ?? null;
}

async function readObject(supabase: any, path: string): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(BOOK_BUCKET).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

type Done = { status: number; body?: unknown; response?: Response; subject?: { name: string; id?: string } };

/** The reader's own copy, as a streamed PDF; or why not. */
export async function downloadBook(
  supabase: any, spec: BookSpec, user: { id: string; email?: string | null }, unlimited: boolean, cors: Record<string, string>,
): Promise<Done> {
  const g = await bookRow(supabase, spec);
  if (!g) return { status: 404, body: { error: 'This guide has not been uploaded yet.' } };
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase.from('career_book_downloads')
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', spec.kind).gte('downloaded_at', since);
  if ((count ?? 0) >= spec.perDay && !unlimited) {
    return { status: 429, body: { error: `You have downloaded this guide ${spec.perDay} times in the last 24 hours. Use the copy you already have; it is the same guide.` } };
  }
  const { data: me } = await supabase.from('members').select('first_name, surname, email').eq('user_id', user.id).maybeSingle();
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const name = (me ? `${me.first_name ?? ''} ${me.surname ?? ''}`.trim() : '') || profile?.full_name || user.email || 'Member';
  const email = (me?.email || user.email || '').trim();
  const original = await readObject(supabase, g.file_path);
  if (!original) throw new Error(`${spec.kind} missing from storage`);
  const today = romeDay();
  // The name as the PDF's font can print it; a name with no Latin form is
  // replaced by the email, so every copy still says whose it is.
  const printed = printable(name).trim();
  const shown = /[A-Za-z]/.test(printed) ? printed : '';
  const issuedTo = shown ? `${shown}${email ? ` (${email})` : ''}` : (email || 'a member of the Society');
  const out = await watermarkPdf(original, {
    footer: `Issued to ${issuedTo} on ${today} · Personal copy · Not for distribution`,
    cover: [
      `This copy was issued to ${shown || email || 'a member of the Society'} on ${today} for personal study.`,
      'Do not copy, share or distribute it.',
      'Every copy carries the name of the person it was issued to.',
    ],
  });
  const { error: logErr } = await supabase.from('career_book_downloads').insert({ user_id: user.id, kind: spec.kind, name, email: email || null, file_id: g.id });
  if (logErr) throw logErr;
  const base = (g.file_name.replace(/\.pdf$/i, '') || spec.folder).replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60);
  const who = (shown || email.split('@')[0]).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  const parts = out.parts;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = parts.shift();
      if (next) controller.enqueue(next); else controller.close();
    },
  });
  return {
    status: 200,
    subject: { name: g.label || g.file_name, id: g.id },
    response: new Response(stream, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'application/pdf',
        'Content-Length': String(out.length),
        'Content-Disposition': `attachment; filename="${base}_${who || 'member'}.pdf"`,
        'Cache-Control': 'no-store',
      },
    }),
  };
}

/** A one-time link to upload a new PDF to. */
export async function bookUploadUrl(supabase: any, spec: BookSpec): Promise<{ bucket: string; path: string; token: string }> {
  const path = `${spec.folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.pdf`;
  const { data, error } = await supabase.storage.from(BOOK_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error('no upload link');
  return { bucket: BOOK_BUCKET, path, token: data.token };
}

/** Check the uploaded PDF and make it the book. */
export async function commitBook(
  supabase: any, spec: BookSpec, userId: string, input: { path: string; file_name: string; title: string },
): Promise<Done> {
  const path = input.path;
  if (!new RegExp(`^${escapeRe(spec.folder)}/\\d+-[0-9a-f]{8}\\.pdf$`).test(path)) return { status: 400, body: { error: 'The upload could not be found. Try again.' } };
  const fileName = (input.file_name.trim() || `${spec.folder.replace(/\W+/g, '_')}.pdf`).slice(-200);
  const label = (input.title.trim() || spec.defaultTitle).slice(0, 120);
  const discard = () => supabase.storage.from(BOOK_BUCKET).remove([path]);
  const bytes = await readObject(supabase, path);
  if (!bytes) return { status: 400, body: { error: 'The upload did not arrive. Try again.' } };
  if (bytes.length > BOOK_MAX_PDF) { await discard(); return { status: 400, body: { error: 'The PDF must be under 60 MB.' } }; }
  // Checked by watermarking it once, exactly as every download will: a
  // PDF that cannot be watermarked is refused now, not in a member's hands.
  let pages = 0;
  try {
    pages = (await watermarkPdf(bytes, { footer: 'Check', cover: ['Check'] })).pages;
  } catch (e) {
    await discard();
    const why = e instanceof Error && /encrypt|password/i.test(e.message) ? 'It is password-protected or encrypted; upload an unprotected copy.' : 'It could not be read as a PDF.';
    return { status: 400, body: { error: `This file cannot be used. ${why}` } };
  }
  const old = await bookRow(supabase, spec);
  if (old) await supabase.from('career_files').delete().eq('id', old.id);
  const { data: row, error } = await supabase.from('career_files').insert({
    kind: spec.kind, label, file_path: path, file_name: fileName, mime_type: 'application/pdf',
    size_bytes: bytes.length, width: pages, uploaded_by: userId,
  }).select('id, label, file_path, file_name, size_bytes, width, updated_at').single();
  if (error) { await discard(); throw error; }
  if (old && old.file_path !== path) await supabase.storage.from(BOOK_BUCKET).remove([old.file_path]);
  return { status: 200, body: { book: bookOut(row as BookRow) }, subject: { name: label, id: (row as BookRow).id } };
}

export async function removeBook(supabase: any, spec: BookSpec): Promise<Done> {
  const g = await bookRow(supabase, spec);
  if (!g) return { status: 200, body: { success: true } };
  await supabase.from('career_files').delete().eq('id', g.id);
  await supabase.storage.from(BOOK_BUCKET).remove([g.file_path]);
  return { status: 200, body: { success: true }, subject: { name: g.label || g.file_name, id: g.id } };
}

export async function bookRegister(supabase: any, spec: BookSpec): Promise<{ name: string; email: string | null; downloaded_at: string }[]> {
  const { data, error } = await supabase.from('career_book_downloads')
    .select('name, email, downloaded_at').eq('kind', spec.kind).order('downloaded_at', { ascending: false }).limit(300);
  if (error) throw error;
  return data || [];
}
