import { useMemo } from 'react';
import { Info, Smartphone, Eye, Check } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { SECTIONS } from '@/lib/workspace-sections';
import { MOBILE_FULL_SUBSECTIONS } from '@/lib/mobile-policy';

// =====================================================================
// Settings > Mobile view: what the workspace offers on a phone.
// ---------------------------------------------------------------------
// The workspace behaves differently below the desktop breakpoint, and
// somebody has to be able to answer "can I do this from my phone?"
// without a phone in their hand, which is exactly what Role permissions
// does for roles.
//
// THIS PAGE USED TO BE A TABLE, and it was a table because the answer
// varied: some subsections worked in full on a phone, some opened
// read-only, and nineteen did not open at all. It no longer varies.
// Every page of the workspace opens on a phone, subject to the role.
// Editing on a phone is opened page by page as Step 98 makes each page
// work there, so the list marks which pages can already be changed.
//
// So the page states the rule, and then lists everything the rule covers
// rather than repeating the same two words down fifty rows. The list is
// GENERATED FROM THE LIVE NAVIGATION - the same subsection list Role
// permissions renders - so it cannot fall behind the workspace it
// describes.
// =====================================================================

// =====================================================================
// THE APPLICANT'S PAGES WORK IN FULL ON A PHONE (Step 98).
// ---------------------------------------------------------------------
// They are not read-only pages: booking an interview or a phone call,
// answering an offer and withdrawing are the applicant's own actions on
// their own candidacy, which the phone cap never reached. They used to
// be opened on a desktop only; they now open on a phone like any other,
// and are marked here as working in full.
// =====================================================================
const APPLICANT_PAGES = new Set([
  'applications-status', 'applications-interview', 'applications-offer', 'applications-faqs',
]);

export default function MobileViewTable() {
  const totalSubsections = useMemo(
    () => SECTIONS.reduce((n, sec) => n + sec.items.filter((it) => !APPLICANT_PAGES.has(it.key)).length, 0),
    [],
  );
  const fullCount = useMemo(
    () => SECTIONS.reduce((n, sec) => n + sec.items.filter((it) => !APPLICANT_PAGES.has(it.key) && MOBILE_FULL_SUBSECTIONS.has(it.key)).length, 0),
    [],
  );

  return (
    <div>
      <WorkspacePageHeader
        title="Mobile View"
        description="What each part of the workspace offers on a phone."
      />

      <div className="flex flex-wrap items-center gap-4 mb-4 font-body text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> below 1024px wide</span>
        <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-amber-700" /> {totalSubsections} member subsections, all of them readable</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-700" /> {fullCount} of them, and the applicant's own pages, work in full</span>
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
            <span className="font-serif text-heading text-accent">Editing, page by page</span>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            The pages ticked below can be changed on a phone. On the others every editing control is
            withheld for now, for every role including the President's, while reading, searching,
            filtering, previewing a document and downloading all keep working. More pages are ticked as
            each is made to work in full on a phone, until every page is.
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
                const full = APPLICANT_PAGES.has(it.key) || MOBILE_FULL_SUBSECTIONS.has(it.key);
                return (
                  <span
                    key={it.key}
                    title={full ? 'Works in full on a phone' : 'Opens on a phone, read only for now'}
                    className="inline-flex items-center gap-1.5 border border-separator bg-muted/30 px-2 py-1"
                  >
                    {full
                      ? <Check className="h-3 w-3 text-emerald-700 shrink-0" />
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
            <span className="text-foreground">Your role is checked by the server too.</span> Whatever your role
            may not do is also refused by the edge functions and the database policies behind them, however
            a request is made, on a phone or a computer.
          </li>
          <li>
            <span className="text-foreground">The ticked pages work in full on a phone</span>: Attendance, taken
            at the door of an event; the GPA converter and Brainteasers, whose saved averages and training
            record are the member's own; the three pages of My Profile, the member's own details,
            certificate and commitment; the six pages of Recruiting, whose registers become a card per
            person and whose filters open in a sheet; every page of Events; every page of People and of
            Settings; every page of Reports and of Career; and every page of Social Media and of
            Operations. Your role still decides what you may do on them.
          </li>
          <li>
            <span className="text-foreground">An applicant's pages all work on a phone</span>: booking an
            interview or a phone call, answering an offer and withdrawing are their own actions on their own
            candidacy. Their bottom bar shows only the pages their stage has opened.
          </li>
        </ul>
      </div>
    </div>
  );
}
