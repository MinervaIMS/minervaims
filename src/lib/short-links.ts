// =====================================================================
// SHORT LINKS (Step 108).
// ---------------------------------------------------------------------
// Each event and each form carries a six-character code (events.short_code,
// internal_forms.short_code, migration 20261125090300), and the website
// opens minervaims.org/e/<code> as the event's registration page and
// minervaims.org/f/<code> as the form, through `short_link_target`. Copy
// link gives the short one; the long links keep working as before.
// =====================================================================

/** The code's own alphabet: no 0, 1, I, L or O, which are misread. */
export const SHORT_CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

export type ShortKind = 'e' | 'f';

const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://minervaims.org');

/** A code as typed or pasted, in capitals, or null when it cannot be one. */
export function readShortCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').trim().toUpperCase();
  return SHORT_CODE.test(code) ? code : null;
}

export function shortLink(kind: ShortKind, code: string): string {
  return `${origin()}/${kind}/${code}`;
}

/** The link to share for an event's registration: short when it has a code. */
export function eventShareLink(ev: { id: string; short_code?: string | null }): string {
  const code = readShortCode(ev.short_code);
  return code ? shortLink('e', code) : `${origin()}/events/${ev.id}/register`;
}

/** The link to share for a form: short when it has a code. */
export function formShareLink(f: { id: string; short_code?: string | null }): string {
  const code = readShortCode(f.short_code);
  return code ? shortLink('f', code) : `${origin()}/forms/${f.id}`;
}

/** Where a short link may lead: only the two kinds of page it stands for. */
export function isShortTarget(kind: ShortKind, target: unknown): target is string {
  if (typeof target !== 'string') return false;
  return kind === 'e'
    ? /^\/events\/[0-9a-f-]{36}\/register$/i.test(target)
    : /^\/forms\/[0-9a-f-]{36}$/i.test(target);
}
