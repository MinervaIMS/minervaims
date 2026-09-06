// =====================================================================
// Saying what actually went wrong.
// ---------------------------------------------------------------------
// Almost every failure in this workspace reached the person as:
//
//     Edge Function returned a non-2xx status code
//
// That sentence is not a description of anything. It does not say which
// function, what it objected to, or what to do instead, and a member who
// meets it has no move available except to try the same thing again.
//
// The maddening part is that the real message existed the whole time.
// Every edge function in this project already answers a refusal with a
// written explanation - "Advisors are appointed from People > Members",
// "The minimum fee is 10 euro per semester", "You cannot change your own
// role" - returned as `{ error: "..." }` alongside a 4xx status.
//
// It was being thrown away by the client library. When a function
// answers with a non-2xx status, supabase-js constructs
// `FunctionsHttpError`, whose message is that fixed string, and hands it
// the raw `Response` as `context` WITHOUT READING THE BODY:
//
//     throw new FunctionsHttpError(response)
//
// So `error.context` is an unread `Response`, `error.context.bodyUsed`
// is false, and the association's own sentence is sitting inside it one
// `await` away. Nothing on the server had to change. Nothing about how
// errors are raised had to change. The client simply had to open the
// envelope it was already being handed.
//
// ---------------------------------------------------------------------
// WHY THIS IS ONE MODULE AND NOT A FIX IN EACH FILE.
//
// Eleven api modules had their own private copy of the same four-line
// wrapper, each ending `if (error) throw error`. That is eleven places to
// remember, and the twelfth would have been written the same way. There
// is now one wrapper, and the reason the old ones were wrong is written
// down here rather than rediscovered.
//
// It also means the 111 call sites that already render `e.message` in a
// toast improve without being touched: they were always displaying the
// right variable, it just never held anything worth reading.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

/** What a failed call turned out to be, once the envelope was opened. */
export interface EdgeFailure {
  /** The sentence to show a person. Never the library's fixed string. */
  message: string;
  /** The HTTP status, where there was one. Drives the fallback wording. */
  status?: number;
}

/**
 * Zod's `format()` output, flattened into one readable line.
 *
 * A validation refusal arrives as `{ error: 'Validation failed', details:
 * { surname: { _errors: ['Required'] } } }`, and "Validation failed" on
 * its own tells somebody staring at a form of fourteen fields nothing at
 * all. Naming the field is the whole value.
 */
function describeValidation(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const parts: string[] = [];
  const walk = (node: Record<string, unknown>, path: string[]) => {
    for (const [key, value] of Object.entries(node)) {
      if (key === '_errors') {
        const errs = Array.isArray(value) ? value.filter((e) => typeof e === 'string') : [];
        if (errs.length && path.length) parts.push(`${path.join(' ')}: ${errs[0]}`);
        continue;
      }
      if (value && typeof value === 'object') walk(value as Record<string, unknown>, [...path, key.replace(/_/g, ' ')]);
    }
  };
  walk(details as Record<string, unknown>, []);
  if (!parts.length) return null;
  // Two named fields is a helpful sentence; nine is a wall.
  return parts.length <= 2 ? parts.join('; ') : `${parts.slice(0, 2).join('; ')}, and ${parts.length - 2} more`;
}

/**
 * Open the envelope: read the body supabase-js left unread.
 *
 * Returns null when there is nothing better to say than what came in, so
 * the caller can fall back rather than replace a real message with a
 * worse one.
 */
export async function readEdgeError(error: unknown): Promise<EdgeFailure | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof context !== 'object') return null;
  const res = context as Response;
  if (typeof res.status !== 'number') return null;
  // A body can only be read once. It is untouched here - supabase-js
  // throws the response before reading it - but a clone costs nothing and
  // means this is safe to call twice on the same error.
  try {
    const body = await (typeof res.clone === 'function' ? res.clone() : res).json();
    const raw = typeof body?.error === 'string' ? body.error : null;
    if (raw === 'Validation failed') {
      const detail = describeValidation(body?.details);
      return { message: detail ? `Some details need correcting. ${detail}` : 'Some of the details are not valid. Please check the form and try again.', status: res.status };
    }
    if (raw) return { message: raw, status: res.status };
  } catch {
    // Not JSON, or the body was empty: fall through to the status.
  }
  return { message: statusSentence(res.status), status: res.status };
}

/**
 * What to say when the server refused without explaining itself.
 *
 * Written as things a member can act on rather than as HTTP vocabulary:
 * nobody has ever been helped by the number 403.
 */
function statusSentence(status: number): string {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'Your role does not allow this action.';
  if (status === 404) return 'That record could not be found. It may have been removed.';
  if (status === 409) return 'That conflicts with something that already exists.';
  if (status === 413) return 'That file is too large to upload.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'The server had a problem completing that. Please try again in a moment.';
  if (status >= 400) return 'That request could not be completed.';
  return 'Something went wrong.';
}

/**
 * Call an edge function and, when it refuses, throw what it actually said.
 *
 * The one wrapper the whole workspace uses. Two failure shapes reach a
 * caller and both are handled: a NON-2XX answer, whose explanation is in
 * the unread response body, and a 2XX answer that nevertheless carries
 * `{ error }`, which several of these functions do for soft failures.
 */
export async function invokeFunction<T = unknown>(
  fn: string,
  options: { body?: unknown; session?: Session | null; headers?: Record<string, string> } = {},
): Promise<T> {
  const { body, session, headers } = options;
  const auth = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  const { data, error } = await supabase.functions.invoke(fn, {
    body: body as Record<string, unknown>,
    headers: { ...auth, ...headers },
  });
  if (error) {
    const opened = await readEdgeError(error);
    if (opened) {
      const e = new Error(opened.message) as Error & { status?: number };
      e.status = opened.status;
      throw e;
    }
    // No response at all: the request never arrived. That is a different
    // failure from a refusal and deserves different words.
    throw new Error(networkSentence(error));
  }
  const soft = (data as { error?: unknown } | null)?.error;
  if (typeof soft === 'string' && soft) throw new Error(soft);
  return data as T;
}

/** A failure with no response behind it: offline, blocked, timed out. */
function networkSentence(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (/abort/i.test(message)) return 'That took too long and was stopped. Please try again.';
  if (/fetch|network|failed to send/i.test(message)) {
    return 'The workspace could not reach the server. Check your connection and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}

/**
 * The `{ data, error }` shape, with an error worth reading.
 *
 * `invokeFunction` throws, which suits the api modules because their
 * callers already sit inside a try/catch. Several components instead
 * branch on the pair, and the shape of that branch is what did the most
 * damage:
 *
 *     if (error || data?.error) {
 *       toast({ description: data?.error || 'Failed to save alumni' });
 *
 * On a refusal `data` is NULL, so `data?.error` is undefined and the
 * hardcoded fallback wins. The association's own explanation was
 * discarded in favour of a sentence that says less than the status code
 * would have. This is the drop-in for those: the same pair, except that
 * `error.message` is the real message and a soft `{ error }` in a 2xx
 * body is folded into it, so one branch covers both.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callFunction<T = any>(
  fn: string,
  options: { body?: unknown; session?: Session | null; headers?: Record<string, string> } = {},
): Promise<{ data: T | null; error: (Error & { status?: number }) | null }> {
  try {
    return { data: await invokeFunction<T>(fn, options), error: null };
  } catch (e) {
    return { data: null, error: e as Error & { status?: number } };
  }
}

// =====================================================================
// The last line of defence, for everything that is not an edge function.
// ---------------------------------------------------------------------
// Direct table reads fail too, and PostgREST is no kinder than the
// functions client: a row-level security refusal arrives as "new row
// violates row-level security policy for table \"events\"", which names
// a policy the reader has never heard of and cannot do anything about.
// =====================================================================

/**
 * The sentence to put in front of a person, whatever was thrown.
 *
 * Safe to call on anything: an Error, a PostgREST object, a string, or
 * something nobody anticipated. It never returns an empty string and
 * never returns the library's fixed non-2xx line.
 */
export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  const raw = typeof err === 'string'
    ? err
    : (err as { message?: unknown })?.message;
  const message = typeof raw === 'string' ? raw.trim() : '';

  // The string this whole module exists to remove. If it ever reaches
  // here, something bypassed `invokeFunction`; say something useful
  // rather than passing it on.
  if (!message || /non-2xx status code/i.test(message)) return fallback;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'The workspace could not reach the server. Check your connection and try again.';
  }
  if (/row-level security|permission denied|insufficient privilege/i.test(message)) {
    return 'Your role does not allow this action.';
  }
  if (/jwt|token is expired|invalid claim/i.test(message)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (/duplicate key|already exists|unique constraint/i.test(message)) {
    return 'That already exists. Please check the existing entry.';
  }
  if (/violates foreign key|still referenced/i.test(message)) {
    return 'That cannot be removed while something else still refers to it.';
  }
  if (/payload too large|exceeds the maximum/i.test(message)) {
    return 'That file is too large. Please upload a smaller one.';
  }
  return message;
}

/**
 * A destructive toast, already worded, from any thrown thing.
 *
 * `toast({ title: 'Could not save', description: e.message })` is the
 * shape used across the workspace; this keeps that shape and only makes
 * the description trustworthy.
 */
export function errorToast(err: unknown, title = 'Something went wrong') {
  return { title, description: friendlyError(err), variant: 'destructive' as const };
}
