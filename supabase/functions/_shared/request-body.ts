// =====================================================================
// Reading a request body without trusting its shape.
// ---------------------------------------------------------------------
// The HTTP 500 that stopped every Media and Operations application had a
// simple anatomy: a value arrived in a different shape from the one the
// code assumed, a cast (`as File`, `as string`) told the compiler not to
// worry about it, and a method that does not exist on the real shape was
// called on it. The TypeError fell through to the catch-all, and a
// refusal that should have been a sentence became a crash.
//
// The same anatomy was in other functions, in three forms:
//
//   * `(body.name as string)?.trim()` - a cast, then a string method. A
//     number or an object in that field throws;
//   * `const body = await req.json()` with no guard - a body that is not
//     JSON throws, and so does one that is JSON but not an object
//     (`null`, a list), the moment a property is read from it;
//   * values passed straight to the database - a division that is not a
//     division, a time that is not a time - whose refusal was rethrown.
//
// These helpers answer the question properly instead of assuming it.
// For every well-formed request they return exactly what the old code
// read, so nothing that works today behaves differently.
// =====================================================================

export type JsonObject = Record<string, unknown>;

/**
 * A request body once it is known to be an object, typed as loosely as
 * `await req.json()` always was. The handlers read dozens of fields from
 * it and each is checked where it is used (or by a schema); typing it as
 * `unknown` here would mean rewriting every one of those reads to change
 * nothing at runtime. The one `any` lives here, so no handler needs its own.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseBody = Record<string, any>;

/**
 * The body as a plain object, or null if it is not one.
 *
 * Null covers every malformed case at once - not JSON, empty, `null`, a
 * list, a number - so the caller can answer with one 400.
 */
export async function readJsonObject(req: Request): Promise<JsonObject | null> {
  try {
    const value = await req.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;
  } catch {
    return null;
  }
}

/** The sentence for a body that could not be read. */
export const UNREADABLE_BODY = 'The request could not be read. Please reload the page and try again.';

/** A text field, trimmed; '' when it is absent or is not text. */
export function textOf(body: JsonObject, key: string): string {
  const v = body[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** A text field, trimmed; null when it is absent, empty or not text. */
export function optionalTextOf(body: JsonObject, key: string): string | null {
  const v = textOf(body, key);
  return v === '' ? null : v;
}

/** `YYYY-MM-DD`, and a real calendar date. */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** `HH:MM` or `HH:MM:SS`, on a 24-hour clock. */
export function isClockTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v);
}
