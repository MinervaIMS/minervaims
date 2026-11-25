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
//
// THE COVER (Step 109). Each book is shown beside the page's title with
// its cover: the PDF's first page, drawn ONCE in the President's browser
// (pdf.js) as a small WebP or JPEG and kept in career_book_covers, so no
// reader's page ever opens the PDF to show it.
//
//   coverSource  the President and the admin account only: the first page
//                of the original, alone, as a PDF, to draw the cover of a
//                book uploaded before covers existed (never a reader's
//                copy, and never more than that one page)
//   saveCover    the drawn cover, checked to be the small picture it says
//                it is, stored against the book it was drawn from
// =====================================================================

// deno-lint-ignore-file no-explicit-any
import { PDFDocument } from 'npm:pdf-lib@1.17.1';
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
export interface BookOut { id: string; title: string | null; file_name: string; size_bytes: number | null; pages: number | null; updated_at: string; cover: string | null }

/** "9 October 2026", on Rome's calendar. */
export function romeDay(d = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function bookOut(g: BookRow | null, cover: string | null = null): BookOut | null {
  return g ? { id: g.id, title: g.label, file_name: g.file_name, size_bytes: g.size_bytes, pages: g.width, updated_at: g.updated_at, cover } : null;
}

// ── The cover ────────────────────────────────────────────────────────

/** The longest cover kept: a small picture, never a page at full size. */
export const COVER_MAX_CHARS = 120000;
const COVER_RE = /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

/** The cover as sent, if it is the small WebP or JPEG it says it is. */
export function validCover(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > COVER_MAX_CHARS || !COVER_RE.test(v)) return null;
  let head: number[];
  try { head = [...atob(v.slice(v.indexOf(',') + 1, v.indexOf(',') + 25))].map((c) => c.charCodeAt(0)); } catch { return null; }
  const webp = head.length >= 12 && String.fromCharCode(...head.slice(0, 4)) === 'RIFF' && String.fromCharCode(...head.slice(8, 12)) === 'WEBP';
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  return (v.startsWith('data:image/webp') ? webp : jpeg) ? v : null;
}

/** A book's stored cover, or null. */
export async function coverOf(supabase: any, fileId: string): Promise<string | null> {
  const { data } = await supabase.from('career_book_covers').select('cover').eq('file_id', fileId).maybeSingle();
  return (data?.cover as string | undefined) ?? null;
}

/** The first page of a PDF, alone, as a PDF of one page. */
export async function firstPagePdf(original: Uint8Array): Promise<Uint8Array> {
  const src = await PDFDocument.load(original, { updateMetadata: false, ignoreEncryption: true });
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(src, [0]);
  out.addPage(page);
  return await out.save();
}

/** Store a drawn cover against the book it was drawn from. */
export async function storeCover(supabase: any, fileId: string, userId: string, cover: string): Promise<void> {
  const { error } = await supabase.from('career_book_covers')
    .upsert({ file_id: fileId, cover, made_by: userId, made_at: new Date().toISOString() }, { onConflict: 'file_id' });
  if (error) throw error;
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

/** The original's first page, for the President's browser to draw the cover from. */
export async function bookCoverSource(supabase: any, spec: BookSpec, cors: Record<string, string>): Promise<Done> {
  const g = await bookRow(supabase, spec);
  if (!g) return { status: 404, body: { error: 'This guide has not been uploaded yet.' } };
  const original = await readObject(supabase, g.file_path);
  if (!original) throw new Error(`${spec.kind} missing from storage`);
  const page = await firstPagePdf(original);
  return {
    status: 200,
    response: new Response(page, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/pdf', 'Content-Length': String(page.length), 'Cache-Control': 'no-store', 'X-Book-Id': g.id },
    }),
  };
}

/** Keep the cover drawn for the book now on the page. */
export async function saveBookCover(supabase: any, spec: BookSpec, userId: string, input: { book_id: string; cover: unknown }): Promise<Done> {
  const cover = validCover(input.cover);
  if (!cover) return { status: 400, body: { error: 'The cover could not be read as a small picture. Try again.' } };
  const g = await bookRow(supabase, spec);
  // Drawn from a book that has since been replaced: the new one gets its own.
  if (!g || g.id !== input.book_id) return { status: 409, body: { error: 'The guide has changed since. Reload the page.' } };
  await storeCover(supabase, g.id, userId, cover);
  return { status: 200, body: { book: bookOut(g, cover) }, subject: { name: g.label || g.file_name, id: g.id } };
}

export async function bookRegister(supabase: any, spec: BookSpec): Promise<{ name: string; email: string | null; downloaded_at: string }[]> {
  const { data, error } = await supabase.from('career_book_downloads')
    .select('name, email, downloaded_at').eq('kind', spec.kind).order('downloaded_at', { ascending: false }).limit(300);
  if (error) throw error;
  return data || [];
}
