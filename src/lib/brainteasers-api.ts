import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';

// =====================================================================
// Career > Brainteasers: what the page asks the `career-brainteasers`
// function. The questions come without their solutions; a solution is
// asked for one at a time, when the reader chooses to see it.
// =====================================================================

export type BtStatus = 'solved' | 'needed_help';

export interface Brainteaser {
  id: string;
  title: string;
  /** The type of question: Probability, Reasoning, Option Theory... */
  field: string;
  /** The firms it is attributed to; may be empty. */
  firms: string[];
  /** Markdown with $...$ and $$...$$ maths. */
  question: string;
  /** Hidden from members (only editors see hidden questions). */
  hidden: boolean;
  sort_order: number;
  updated_at?: string;
}

export interface BtProgress {
  status: BtStatus | null;
  flagged: boolean;
  note: string | null;
  revealed_at: string | null;
  status_at: string | null;
}

export interface Greenbook {
  id: string;
  title: string | null;
  file_name: string;
  size_bytes: number | null;
  pages: number | null;
  updated_at: string;
}

export interface BrainteasersData {
  problems: Brainteaser[];
  progress: Record<string, BtProgress>;
  can_manage: boolean;
  can_replace_greenbook: boolean;
  greenbook: Greenbook | null;
  limits: { reveal_per_hour: number; reveal_per_day: number; greenbook_per_day: number };
}

const FN = 'career-brainteasers';
const call = <T>(session: Session | null, body: Record<string, unknown>) => invokeFunction<T>(FN, { body, session });

export const loadBrainteasers = (s: Session | null) => call<BrainteasersData>(s, { action: 'list' });

export const revealSolution = (s: Session | null, id: string) =>
  call<{ id: string; answer: string; revealed_at: string }>(s, { action: 'reveal', id });

export const saveProgress = (s: Session | null, id: string, patch: Partial<Pick<BtProgress, 'status' | 'flagged' | 'note'>>) =>
  call<{ id: string; progress: BtProgress }>(s, { action: 'progress', id, ...patch });

export const resetProgress = (s: Session | null) => call<{ success: boolean }>(s, { action: 'reset' });

export interface BrainteaserDraft {
  id?: string;
  title: string;
  field: string;
  firms: string[];
  question: string;
  answer: string;
  hidden: boolean;
}
export const saveBrainteaser = (s: Session | null, problem: BrainteaserDraft) =>
  call<{ problem: Brainteaser & { answer: string } }>(s, { action: 'save', problem });

// ── The greenbook ─────────────────────────────────────────────────────

/** The reader's own watermarked copy, as a file to save. */
export async function downloadGreenbook(s: Session | null): Promise<Blob> {
  const data = await invokeFunction<unknown>(FN, { body: { action: 'greenbook-download' }, session: s });
  if (!(data instanceof Blob)) throw new Error('The download did not arrive. Please try again.');
  return data;
}

/** Replace the greenbook: a one-time link, the file straight to storage, then the check. */
export async function uploadGreenbook(s: Session | null, file: File, title?: string): Promise<Greenbook> {
  const link = await call<{ bucket: string; path: string; token: string }>(s, { action: 'greenbook-upload-url' });
  const { error } = await supabase.storage.from(link.bucket).uploadToSignedUrl(link.path, link.token, file, { contentType: 'application/pdf' });
  if (error) throw new Error(/size|large|exceed/i.test(error.message) ? 'The PDF is larger than storage accepts (60 MB).' : 'The upload did not go through. Please try again.');
  const done = await call<{ greenbook: Greenbook }>(s, { action: 'greenbook-commit', path: link.path, file_name: file.name, title });
  return done.greenbook;
}

export const removeGreenbook = (s: Session | null) => call<{ success: boolean }>(s, { action: 'greenbook-remove' });

export interface GreenbookDownload { name: string; email: string | null; downloaded_at: string }
export const greenbookRegister = (s: Session | null) =>
  call<{ downloads: GreenbookDownload[] }>(s, { action: 'greenbook-register' }).then((r) => r.downloads);
