import { useMemo } from 'react';
import { Info, Smartphone, Eye, Check, Monitor } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { SECTIONS } from '@/lib/workspace-sections';

// =====================================================================
// Settings > Mobile view — what the workspace offers on a phone.
// ---------------------------------------------------------------------
// The workspace behaves differently below the desktop breakpoint, and
// somebody has to be able to answer "can I do this from my phone?"
// without a phone in their hand, which is exactly what Role permissions
// does for roles.
//
// THIS PAGE USED TO BE A TABLE, and it was a table because the answer
// varied: some subsections worked in full on a phone, some opened
// read-only, and nineteen did not open at all. It no longer varies.
// Every page of the workspace opens on a phone, subject to the role,
// and nothing at all can be edited from one.
//
// So the page states the rule, and then lists everything the rule covers
// rather than repeating the same two words down fifty rows. The list is
// GENERATED FROM THE LIVE NAVIGATION - the same subsection list Role
// permissions renders - so it cannot fall behind the workspace it
// describes.
// =====================================================================

// =====================================================================
// THE ONE EXCEPTION, AND IT IS NOT A MEMBER'S.
// ---------------------------------------------------------------------
// An applicant's four pages are not read-only pages: booking an
// interview and answering an offer are the applicant's own actions on
// their own candidacy, and they are the entire purpose of the pages. A
// read-only phone would show an applicant a booking list they could not
// book from, which is worse than telling them plainly to use a computer.
// So the applicant's workspace is still opened on a desktop, exactly as
// it was, and it is marked here rather than quietly omitted.
// =====================================================================
const APPLICANT_PAGES = new Set([
  'applications-status', 'applications-interview', 'applications-offer', 'applications-faqs',
]);

export default function MobileViewTable() {
  const totalSubsections = useMemo(
    () => SECTIONS.reduce((n, sec) => n + sec.items.filter((it) => !APPLICANT_PAGES.has(it.key)).length, 0),
    [],
  );

  return (
    <div>
      <WorkspacePageHeader
        title="Mobile view"
        description="What each part of the workspace offers on a phone."
      />

      <div className="flex flex-wrap items-center gap-4 mb-4 font-body text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> below 1024px wide</span>
        <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-amber-700" /> {totalSubsections} member subsections, all of them readable</span>
        <span className="inline-flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> the applicant's own pages, on a desktop</span>
      </div>

      {/* The rule, as the two facts it consists of. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-separator p-5">
          <div className="flex items-center gap-2 mb-2">
            <Check className="h-5 w-5 text-emerald-700" />
            <span className="font-serif text-heading text-accent">Every page opens</span>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            There is no member page that a phone refuses to show. Which pages you see is decided by your
            role, exactly as it is on a computer: a page your role cannot open stays closed on both, and a
            page it can open is here in full, to read.
          </p>
        </div>
        <div className="border border-separator p-5">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-5 w-5 text-amber-700" />
            <span className="font-serif text-heading text-accent">Nothing can be edited</span>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            On a phone every editing control is withheld, on every page, for every role including the
            President's. Reading, searching, filtering, previewing a document and downloading all keep
            working. Changing something is done from a computer.
          </p>
        </div>
      </div>

      {/* What the rule covers, section by section. */}
      <div className="mt-6 border border-separator">
        {SECTIONS.map((sec) => (
          <div key={sec.section} className="border-b border-separator last:border-b-0">
            <div className="bg-accent/5 px-3 py-1.5 text-accent font-serif uppercase tracking-wider text-[11px]">
              {sec.section}
            </div>
            <div className="px-3 py-2.5 flex flex-wrap gap-x-2 gap-y-1.5 font-body text-xs">
              {sec.items.map((it) => {
                const applicant = APPLICANT_PAGES.has(it.key);
                return (
                  <span
                    key={it.key}
                    title={applicant ? 'The applicant opens this on a desktop' : 'Opens on a phone, read only'}
                    className={`inline-flex items-center gap-1.5 border px-2 py-1 ${
                      applicant ? 'border-separator text-muted-foreground' : 'border-separator bg-muted/30'
                    }`}
                  >
                    {applicant
                      ? <Monitor className="h-3 w-3 shrink-0" />
                      : <Eye className="h-3 w-3 text-amber-700 shrink-0" />}
                    {it.label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 font-body">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-accent" />
          <span className="font-serif text-heading text-accent">How the rule works</span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2 text-sm text-muted-foreground">
          <li>
            The mobile rule is a <span className="text-foreground">cap, never a grant</span>. It can only take
            away what your role already gives you, so it makes a page read-only and it never opens one your
            role could not open anyway.
          </li>
          <li>
            <span className="text-foreground">The desktop is never affected.</span> The cap engages below
            1024 pixels wide, which is the same threshold that switches the workspace to its mobile shell.
            Rotating a tablet into landscape is enough to leave it.
          </li>
          <li>
            <span className="text-foreground">Wide pages scroll sideways.</span> The pages built for a large
            screen, such as the treasury ledger, the recruiting pipeline and the fund matrix, keep all of
            their columns on a phone: the table is dragged left and right rather than trimmed.
          </li>
          <li>
            <span className="text-foreground">It applies to the server too.</span> What is withheld here is
            also refused by the edge functions and the database policies behind them, so the rule holds
            however a request is made.
          </li>
          <li>
            <span className="text-foreground">An applicant is the exception</span>, because their four pages
            are not pages they read: booking an interview and answering an offer are their own actions on
            their own candidacy. Applicants are still asked to use a computer, as they were before.
          </li>
        </ul>
      </div>
    </div>
  );
}
