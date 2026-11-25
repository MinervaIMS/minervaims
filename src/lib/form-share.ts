// =====================================================================
// A FORM'S LINK, AS A CHAT APP SHOWS IT (Step 109).
// ---------------------------------------------------------------------
// A form's link (/forms/<id>, or its short link /f/<code>) is passed
// round the Society's chats. Its card says which form it is, by its own
// title (the President's choice), and whose: the page's own words, worked
// out here once for the page (InternalFormPage.tsx) and for the build
// (vite.static-pages.ts), so the two never disagree. A form for members
// says so; a form open to guests says it is the Society's.
//
// Only relative imports: the build reads this file.
// =====================================================================

export interface ShareableForm {
  id: string;
  title: string;
  /** internal: members only; external: guests with the link; both. */
  audience?: string | null;
}

/** The form's page: the one canonical form of its link. */
export const formPath = (id: string) => `/forms/${id}`;

export function formShareDescription(f: ShareableForm): string {
  return f.audience === 'internal' || !f.audience
    ? 'A form for the members of Minerva Investment Management Society.'
    : 'A form from Minerva Investment Management Society.';
}

/** Everything the page's head needs: one source for the page and the build. */
export function formShareHead(f: ShareableForm) {
  return {
    path: formPath(f.id),
    title: f.title,
    description: formShareDescription(f),
    card: 'form',
    // A form is a transaction, never an answer to a search.
    noindex: true,
  };
}
