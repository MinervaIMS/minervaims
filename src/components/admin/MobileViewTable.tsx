import { Fragment, useMemo } from 'react';
import { Info, Smartphone } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { SECTIONS } from '@/lib/workspace-sections';
import { MOBILE_POLICY, mobilePolicyFor, type MobilePolicy } from '@/lib/mobile-policy';

// =====================================================================
// Settings > Mobile view — what the workspace offers on a phone.
// ---------------------------------------------------------------------
// The workspace behaves differently below the desktop breakpoint, and
// until now that was a fact you could only discover by opening it on a
// phone and finding a page missing. Somebody has to be able to answer
// "can I do this from my phone?" without a phone in their hand, which is
// exactly what Role permissions does for roles.
//
// So this is that table, for the other axis. It is GENERATED FROM THE
// LIVE POLICY - the same `MOBILE_POLICY` the workspace itself reads, and
// the same subsection list Role permissions renders - so it cannot drift
// from the behaviour it describes. There is nothing to edit here and no
// state: change the policy and this page changes with it.
//
// THE DESKTOP COLUMN IS THERE FOR CONTRAST, and it says the same thing
// on every row on purpose. On a computer the answer is always "whatever
// your role allows"; the phone is the only place a second rule applies,
// and putting the two side by side is what makes that visible.
// =====================================================================

const POLICY_STYLE: Record<MobilePolicy, { text: string; cls: string; meaning: string }> = {
  full: {
    text: 'Full',
    cls: 'bg-emerald-50 text-emerald-700',
    meaning: 'Opens on a phone and works exactly as it does on a computer, within your role.',
  },
  view: {
    text: 'Read only',
    cls: 'bg-amber-50 text-amber-700',
    meaning: 'Opens on a phone so you can read it, but every editing control is withheld, whatever your role.',
  },
  no: {
    text: 'Desktop only',
    cls: 'bg-muted text-muted-foreground',
    meaning: 'Listed in the navigation but not opened on a phone: a card explains it needs a computer.',
  },
};

export default function MobileViewTable() {
  const grid = useMemo(
    () => SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.map((it) => ({ ...it, policy: mobilePolicyFor(it.key) })),
    })),
    [],
  );

  // Counted from the same source the table renders, so the summary can
  // never disagree with the rows underneath it.
  const totals = useMemo(() => {
    const counts: Record<MobilePolicy, number> = { full: 0, view: 0, no: 0 };
    for (const sec of grid) for (const it of sec.items) counts[it.policy] += 1;
    return counts;
  }, [grid]);

  return (
    <div>
      <WorkspacePageHeader
        title="Mobile view"
        description="What each part of the workspace offers on a phone. This prospect is generated from the workspace's live mobile rules, so it always reflects what actually happens on a small screen."
      />

      <div className="flex flex-wrap items-center gap-4 mb-4 font-body text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-100 inline-block" /> Full: works as on a computer ({totals.full})</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 inline-block" /> Read only: opens, but nothing can be changed ({totals.view})</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-muted inline-block" /> Desktop only ({totals.no})</span>
        <span className="inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> below 1024px wide</span>
      </div>

      <div className="max-w-full overflow-x-auto border border-separator">
        <table className="w-full border-collapse font-body text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-muted text-left px-3 py-2 font-serif text-sm border-b border-r border-separator min-w-[210px]">Subsection</th>
              <th className="bg-muted px-2 py-2 border-b border-separator min-w-[110px]">
                <div className="text-[11px] font-normal text-muted-foreground text-center leading-tight">On a computer</div>
              </th>
              <th className="bg-muted px-2 py-2 border-b border-separator min-w-[110px]">
                <div className="text-[11px] font-normal text-muted-foreground text-center leading-tight">On a phone</div>
              </th>
              <th className="bg-muted px-3 py-2 border-b border-separator text-left">
                <div className="text-[11px] font-normal text-muted-foreground leading-tight">What that means</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.map((sec) => (
              <Fragment key={sec.section}>
                <tr>
                  <td colSpan={4} className="bg-accent/5 border-b border-separator p-0">
                    <span className="sticky left-0 inline-block text-accent font-serif px-3 py-1.5 uppercase tracking-wider text-[11px]">{sec.section}</span>
                  </td>
                </tr>
                {sec.items.map((it) => {
                  const s = POLICY_STYLE[it.policy];
                  return (
                    <tr key={it.key} className="hover:bg-muted/30">
                      <th className="sticky left-0 z-10 bg-background text-left font-normal px-3 py-1.5 border-b border-r border-separator">
                        {it.label}
                      </th>
                      <td className="text-center px-2 py-1.5 border-b border-separator text-muted-foreground">
                        Per role
                      </td>
                      <td className={`text-center px-2 py-1.5 border-b border-separator ${s.cls}`}>
                        <span className="whitespace-nowrap">{s.text}</span>
                      </td>
                      <td className="px-3 py-1.5 border-b border-separator text-muted-foreground">
                        {s.meaning}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 font-body">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-accent" />
          <span className="font-serif text-heading text-accent">How the rule works</span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2 text-sm text-muted-foreground">
          <li>
            The mobile rule is a <span className="text-foreground">cap, never a grant</span>. It can only take
            away what your role already gives you: a page marked Read only is read-only for everybody on a
            phone, including the President, and a page your role cannot open stays closed on both.
          </li>
          <li>
            <span className="text-foreground">The desktop is never affected.</span> The cap engages below
            1024 pixels wide, which is the same threshold that switches the workspace to its mobile shell.
            Rotating a tablet into landscape is enough to leave it.
          </li>
          <li>
            <span className="text-foreground">Desktop only is a deliberate answer, not a gap.</span> The
            pages marked so are the ones that need a wide table, a long form or a file the phone cannot
            handle well: the Treasury ledger, the recruiting pipeline, the fund matrix.
          </li>
          <li>
            Everything here is read from <code className="bg-muted px-1 text-foreground">MOBILE_POLICY</code>,
            the same table the workspace consults when it decides what to show. There are{' '}
            {Object.keys(MOBILE_POLICY).length} subsections in it, and this page lists every one that appears
            in the navigation.
          </li>
        </ul>
      </div>
    </div>
  );
}
