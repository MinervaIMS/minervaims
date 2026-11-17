// =====================================================================
// link-guard: a link can open a page, never run a script (Step 106).
// ---------------------------------------------------------------------
// Many links on the website and in the workspace are built from an
// address somebody typed: a LinkedIn profile, a meeting, a reading, a
// partner's site, a resource. The functions that store them check what
// they are given, but a check written per field is a check that one
// field will one day be added without. A browser treats an address that
// begins `javascript:` as a script to run on the page that shows the
// link, with the reader's own session.
//
// So, once for the whole site: a click on a link whose address would
// run a script instead of opening something does nothing at all. Every
// ordinary address (https, http, mailto, tel, a path of this site, a
// downloaded file) is untouched.
//
// Nothing here runs when the module is loaded: `installLinkGuard` is
// called once, from main.tsx.
// =====================================================================

/** Would opening this address run code instead of going somewhere? */
export function isUnsafeHref(raw: string | null | undefined): boolean {
  if (!raw) return false;
  // A browser ignores spaces, tabs and line breaks inside the scheme, so
  // they are removed before looking at it.
  // eslint-disable-next-line no-control-regex
  const compact = raw.replace(/[\u0000- ]+/g, '').toLowerCase();
  return compact.startsWith('javascript:') || compact.startsWith('vbscript:') || compact.startsWith('data:text/html');
}

let installed = false;

/** Stop a click on a link that would run a script. Safe to call twice. */
export function installLinkGuard(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const stop = (event: Event) => {
    const target = event.target as Element | null;
    const link = target?.closest?.('a[href], area[href]');
    if (!link) return;
    if (isUnsafeHref(link.getAttribute('href'))) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  // Capture phase, so no handler on the page sees the click first. A
  // middle click and a keyboard activation arrive as `auxclick` and
  // `click`.
  document.addEventListener('click', stop, true);
  document.addEventListener('auxclick', stop, true);
}
