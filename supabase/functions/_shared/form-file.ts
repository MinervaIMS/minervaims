// =====================================================================
// A form field is a file only when it actually is one.
// ---------------------------------------------------------------------
// `FormData.get()` returns `File | string | null`, and every reader of an
// upload in this project wrote:
//
//     const file = form.get('file') as File | null
//
// which is a CAST, not a check. It states an intention and enforces
// nothing, and the intention is wrong whenever the field arrives as text.
//
// It arrives as text more easily than it looks. `FormData.append` accepts
// anything and turns whatever is not a Blob into a STRING, so appending a
// variable that happens to be null sends the four characters "null" as
// the field's value. That value is truthy, it has no `size`, and its
// `slice()` is `String.prototype.slice` - which returns a string, not a
// Blob, so the `.arrayBuffer()` called on it does not exist.
//
// That is not a hypothetical. It is exactly how every application to
// Media and Operations - the one intake that asks for no written answer,
// so the client had nothing to attach - died with an HTTP 500 in the
// middle of the PDF check, telling the applicant only that "an
// unexpected error occurred".
//
// So the question is asked properly, in one place. A real upload behaves
// exactly as it always has; anything else reads as ABSENT, which is what
// each of those casts was already trying to say.
// =====================================================================

/**
 * The file posted under `name`, or null if there isn't one.
 *
 * Duck-typed rather than `instanceof File`, because a Blob posted without
 * a filename is still a perfectly good upload and different runtimes
 * disagree about which constructor it got.
 */
export function readFileField(form: FormData, name: string): File | null {
  const value = form.get(name);
  if (value === null || typeof value !== 'object') return null;
  const file = value as File;
  const usable = typeof file.size === 'number'
    && typeof file.arrayBuffer === 'function'
    && typeof file.slice === 'function';
  return usable ? file : null;
}

/**
 * A text field, safely.
 *
 * The mirror of the same mistake: `(form.get(k) as string).trim()` throws
 * if a file is ever posted under a text field's name, and a thrown
 * TypeError inside a request handler is an HTTP 500 for something that
 * should have been a plain refusal.
 */
export function readTextField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}
