// =====================================================================
// linkedin — turning what somebody typed into a link that is safe to
// put an `href` on.
// ---------------------------------------------------------------------
// A CANDIDATE'S LINKEDIN IS THE ONE URL IN THE WORKSPACE NOBODY CHECKED.
//
// Every other link a member follows was entered by a member through an
// endpoint that validates it: `admin-members`, for instance, refuses a
// LinkedIn address that does not begin with http:// or https://. The
// application form is different. It is public, `linkedin_url` is a free
// text field on it, and `submit-application` stores exactly what was
// typed, with no validation of any kind. Whatever a stranger put in that
// box is what the workspace later renders.
//
// So three things can arrive, and only the first of them works:
//
//   "https://linkedin.com/in/name"  an address
//   "linkedin.com/in/name"          NO SCHEME. As an `href` this is a
//                                   RELATIVE path, so a reviewer who
//                                   clicks it is navigated to
//                                   /workspace/.../linkedin.com/in/name
//                                   and loses the page they were on.
//   "javascript:…"                  a scheme that executes rather than
//                                   navigates, in the workspace's own
//                                   origin, on a reviewer's session.
//
// The third is unlikely and is the reason this file exists rather than a
// one-line `href={value}`: it is a stored, unvalidated, stranger-supplied
// string, and the only sound way to render one as a link is to parse it
// and refuse anything that is not plainly http or https.
// =====================================================================

/**
 * The address to open for a stored LinkedIn value, or `null` if there is
 * nothing safe to open.
 *
 * A missing scheme is READ AS AN OVERSIGHT AND CORRECTED, because it is
 * by far the commonest way the field is filled in and refusing it would
 * hide a profile the candidate did give. Anything that names a scheme
 * other than http or https is refused outright rather than corrected: a
 * value that says `javascript:` is not a mistyped web address.
 *
 * The host is not required to be LinkedIn's. Shortened and localised
 * addresses (lnkd.in, it.linkedin.com) are real, and the safety of the
 * link is decided by its scheme, not by its domain.
 */
export function safeLinkedInUrl(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  // `new URL` needs a scheme. Add one only when the value does not name a
  // scheme at all, so that a value which DOES name one is judged on it.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  const candidate = hasScheme ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // A scheme and nothing else ("https://") is not an address.
    if (!url.hostname || !url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}
