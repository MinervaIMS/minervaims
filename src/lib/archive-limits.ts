// =====================================================================
// What the archive will accept, stated where a form can read it.
// ---------------------------------------------------------------------
// A limit that only the server knows is not a limit, it is an ambush: the
// writer finds out by losing the work. A report description of 2308
// characters - an ordinary equity research abstract - was refused in full
// with nothing said beyond "Invalid file data", which named neither the
// field nor the rule.
//
// The number lives here so the form can COUNT AGAINST IT while the
// description is being written, and so a save that cannot succeed is
// stopped before the record is touched.
//
// MUST MATCH `REPORT_DESCRIPTION_MAX` in supabase/functions/admin-files.
// The server is still the authority - a browser is never trusted with a
// rule - but the two should never disagree, because the point of the one
// here is to make the one there invisible.
// =====================================================================

/** Characters allowed in a report's description. About 1,200 words. */
export const REPORT_DESCRIPTION_MAX = 8000;

/** The counter under the field, and whether it should be shouting yet. */
export function describeLength(value: string, max = REPORT_DESCRIPTION_MAX) {
  const length = value.trim().length;
  return {
    length,
    max,
    over: length > max,
    /** Past nine tenths, the count stops being decoration. */
    near: length > max * 0.9,
    text: length > max
      ? `${length.toLocaleString()} characters: ${(length - max).toLocaleString()} over the limit of ${max.toLocaleString()}`
      : `${length.toLocaleString()} of ${max.toLocaleString()} characters`,
  };
}
