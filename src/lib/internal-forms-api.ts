// =====================================================================
// Internal forms: the calls to the `internal-forms` edge function.
// Every read and write goes through it; the tables are closed to the
// browser. See supabase/functions/internal-forms/index.ts.
// =====================================================================

import type { Session } from '@supabase/supabase-js';
import { invokeFunction, callFunction } from '@/lib/errors';
import type { Answers, FileAnswer, FormField } from '@/lib/internal-forms-rules';

export type FormStatus = 'draft' | 'open' | 'closed';

export interface InternalForm {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  status: FormStatus;
  closes_at: string | null;
  allow_edits: boolean;
  track_payments: boolean;
  payment_amount: number | null;
  payment_instructions: string | null;
  confirmation_message: string | null;
  /** The cover picture, a stored path. */
  cover_path: string | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  /** In the list only. */
  responses?: number;
  paid_count?: number;
  cover_url?: string | null;
}

/** One-hour links to a form's pictures, by stored path. */
export type ImageUrls = Record<string, string>;

export interface FormResponse {
  id: string;
  form_id: string;
  user_id: string;
  member_name: string | null;
  member_email: string | null;
  member_role: string | null;
  member_division: string | null;
  answers: Answers;
  submitted_at: string;
  updated_at: string;
  edit_count: number;
  paid: boolean;
  paid_at: string | null;
  paid_by_name: string | null;
  staff_note: string | null;
  /** What the member owes for what they ordered, fixed when they sent it. */
  amount_due: number | null;
}

/** What a member sees of a form. */
export interface MemberForm {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  closes_at: string | null;
  allow_edits: boolean;
  track_payments: boolean;
  payment_amount: number | null;
  payment_instructions: string | null;
  confirmation_message: string | null;
  cover_path: string | null;
  state: 'draft' | 'open' | 'closed';
}

export interface MyFormSummary {
  id: string;
  title: string;
  description: string | null;
  closes_at: string | null;
  allow_edits: boolean;
  track_payments: boolean;
  payment_amount: number | null;
  answered_at: string | null;
  paid: boolean;
  cover_url: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = <T = any>(session: Session | null, body: Record<string, unknown>) =>
  invokeFunction<T>('internal-forms', { body, session });

// ── Organisers ──────────────────────────────────────────────────────
export const listForms = (s: Session | null) => call<{ forms: InternalForm[] }>(s, { action: 'list' }).then((r) => r.forms);
export const getForm = (s: Session | null, id: string) => call<{ form: InternalForm; responses: FormResponse[]; images?: ImageUrls }>(s, { action: 'get', id });
export const saveForm = (s: Session | null, form: Partial<InternalForm>) => call<{ form: InternalForm; images?: ImageUrls }>(s, { action: 'save', form }).then((r) => r.form);
/** Save, and also return fresh links to the pictures the form now shows. */
export const saveFormWithImages = (s: Session | null, form: Partial<InternalForm>) => call<{ form: InternalForm; images?: ImageUrls }>(s, { action: 'save', form });
export const setFormStatus = (s: Session | null, id: string, status: FormStatus) => call<{ form: InternalForm }>(s, { action: 'set-status', id, status }).then((r) => r.form);
export const duplicateForm = (s: Session | null, id: string) => call<{ form: InternalForm }>(s, { action: 'duplicate', id }).then((r) => r.form);
export const deleteForm = (s: Session | null, id: string) => call(s, { action: 'delete', id });
export const setResponsePaid = (s: Session | null, responseId: string, paid: boolean) =>
  call<{ response: Pick<FormResponse, 'id' | 'paid' | 'paid_at' | 'paid_by_name'> }>(s, { action: 'set-paid', response_id: responseId, paid }).then((r) => r.response);
export const setResponseNote = (s: Session | null, responseId: string, note: string) =>
  call<{ response: Pick<FormResponse, 'id' | 'staff_note'> }>(s, { action: 'set-note', response_id: responseId, note }).then((r) => r.response);
export const deleteResponse = (s: Session | null, responseId: string) => call(s, { action: 'delete-response', response_id: responseId });
export const signFormFiles = (s: Session | null, paths: string[]) =>
  (paths.length ? call<{ urls: Record<string, string> }>(s, { action: 'sign', paths }).then((r) => r.urls) : Promise.resolve({} as Record<string, string>));

// ── Members ─────────────────────────────────────────────────────────
export const myForms = (s: Session | null) => call<{ forms: MyFormSummary[] }>(s, { action: 'my-forms' }).then((r) => r.forms);
export interface MyResponse { answers: Answers; submitted_at: string; updated_at: string; paid: boolean; amount_due?: number | null }
export const fillGet = (s: Session | null, id: string) =>
  call<{ form: MemberForm; me: { name: string; email: string; can_answer: boolean }; response: MyResponse | null; files: Record<string, string>; images?: ImageUrls }>(s, { action: 'fill-get', id });

/** Send answers. Field errors come back as `errors`, keyed by question. */
export async function submitAnswers(s: Session | null, id: string, answers: Answers): Promise<
  { ok: true; emailed: boolean; response: MyResponse } | { ok: false; error: string; errors?: Record<string, string> }
> {
  try {
    const data = await call<{ success?: boolean; emailed?: boolean; invalid?: boolean; message?: string; errors?: Record<string, string>; response?: MyResponse }>(s, { action: 'submit', id, answers });
    if (data.invalid) return { ok: false, error: data.message || 'Some answers need attention.', errors: data.errors };
    if (data.success && data.response) return { ok: true, emailed: !!data.emailed, response: data.response };
    return { ok: false, error: 'Your answers could not be sent. Please try again.' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Your answers could not be sent. Please try again.' };
  }
}

/** Put a picture in a form (cover, picture block or choice). Organisers only. */
export async function uploadFormImage(session: Session | null, formId: string, file: File): Promise<{ path: string; url: string | null }> {
  const fd = new FormData();
  fd.append('purpose', 'form-image');
  fd.append('form_id', formId);
  fd.append('file', file);
  const { data, error } = await callFunction<{ file?: FileAnswer; url?: string | null; error?: string }>('internal-forms', { body: fd, session });
  if (error) throw error;
  if (!data?.file) throw new Error(data?.error || 'The upload did not complete.');
  return { path: data.file.path, url: data.url ?? null };
}

/**
 * Attach one file to a question, reporting progress. Uses XMLHttpRequest
 * because it is the only way a browser reports upload progress; falls
 * back to the plain call where the functions address is unknown.
 */
export function uploadFormFile(
  session: Session | null,
  formId: string,
  fieldId: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<FileAnswer> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const fd = new FormData();
  fd.append('form_id', formId);
  fd.append('field_id', fieldId);
  fd.append('file', file);
  if (!base || typeof XMLHttpRequest === 'undefined' || !session?.access_token) {
    onProgress?.(0);
    return callFunction<{ file?: FileAnswer; error?: string }>('internal-forms', { body: fd, session }).then(({ data, error }) => {
      if (error) throw error;
      if (!data?.file) throw new Error(data?.error || 'The upload did not complete.');
      onProgress?.(1);
      return data.file;
    });
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base.replace(/\/$/, '')}/functions/v1/internal-forms`);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (key) xhr.setRequestHeader('apikey', key);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress?.(Math.min(0.99, e.loaded / e.total)); };
    xhr.onload = () => {
      let body: { file?: FileAnswer; error?: string } | null = null;
      try { body = JSON.parse(xhr.responseText); } catch { body = null; }
      if (xhr.status >= 200 && xhr.status < 300 && body?.file) { onProgress?.(1); resolve(body.file); return; }
      reject(new Error(body?.error || 'The upload did not complete. Please try again.'));
    };
    xhr.onerror = () => reject(new Error(navigator.onLine === false
      ? 'You appear to be offline. Check your connection and try again.'
      : 'The workspace could not reach the server. Check your connection and try again.'));
    xhr.send(fd);
  });
}
