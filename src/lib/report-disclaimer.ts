// =====================================================================
// THE NOTE AT THE FOOT OF EVERY REPORT PAGE (Step 112).
// ---------------------------------------------------------------------
// A few lines after "Cite this report", at the end of the white part of
// the page, before the grey band of the related reports: who
// publishes the report, that the association is independent from
// Università Bocconi, and that the report is not investment advice, with
// the way to the legal pages. Every sentence restates what the Disclaimer
// already says (sections 01, 02, 05 and 06), so the note adds no new
// commitment; the legal pages remain the reference.
//
// One text for the page and for its static copy (src/lib/static/render.ts),
// so people and machines read the same words.
// =====================================================================

export const REPORT_DISCLAIMER = {
  heading: 'Important information',
  paragraphs: [
    'Minerva Investment Management Society is a non-profit student society, run by students and independent from Università Bocconi, which does not review, approve or endorse its reports.',
    'This report was prepared by its student authors for educational purposes only, and the opinions in it are theirs at the time of publication. It is not investment advice, a personal recommendation or an offer to buy or sell any financial instrument.',
  ],
  /** The closing line, with the legal pages it points to: each link is read as "the <label>". */
  more: { before: 'More in ', links: [{ href: '/disclaimer', label: 'Disclaimer' }, { href: '/terms-of-use', label: 'Terms of Use' }], after: ' and the other legal pages.' },
} as const;
