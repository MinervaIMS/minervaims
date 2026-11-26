import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { Segmented } from '@/components/admin/career/gpa/shared';
import ApplicationSettings from '@/components/admin/ApplicationSettings';
import FormSettings from '@/components/admin/FormSettings';

// =====================================================================
// RECRUITING, APPLICATION SETUP (Step 110).
// ---------------------------------------------------------------------
// Application Page and Form & Questions were two subsections set apart
// in the menu, and together they are one job: preparing the round. They
// are now one page in two tabs, in the order the job is done:
//
//   Dates and divisions  when applications open and close, which
//                        divisions take part (or have closed early),
//                        and the declarations asked of applicants
//                        (`applications-website`)
//   Division questions   the written question each division asks
//                        (`applications-form`), locked while the round
//                        is open
//
// Each tab keeps its own row in the access matrix (COMBINED_RESOURCES),
// so nobody gains or loses anything: the page opens for whoever may open
// either tab, and shows the tabs they may open. Their old addresses open
// the right tab (MERGED_SUBSECTIONS).
// =====================================================================

const TAB_LABEL: Record<string, string> = { 'dates-and-divisions': 'Dates and divisions', questions: 'Division questions' };

export default function ApplicationSetup({ tabs, activeTab, onTab }: {
  /** The tabs this reader may open, in order. */
  tabs: { tab: string; resource: string; label: string }[];
  activeTab: string | null;
  onTab: (tab: string) => void;
}) {
  const current = activeTab ?? tabs[0]?.tab ?? 'dates-and-divisions';
  return (
    <div>
      <WorkspacePageHeader
        title="Application Setup"
        description="Everything applicants meet before they apply: when applications open and close, which divisions take part, and the question each division asks."
        actions={<Button data-ro variant="outline" className="font-body h-11 lg:h-10" onClick={() => window.open('/apply?preview=1', '_blank', 'noopener')}><Eye className="h-4 w-4 mr-2" />Preview the form</Button>}
      />
      {tabs.length > 1 && (
        <div className="mb-6">
          <Segmented<string>
            value={current} onChange={onTab} label="Part of the setup" nowrap className="w-full sm:w-auto sm:inline-flex"
            options={tabs.map((t) => ({ value: t.tab, label: TAB_LABEL[t.tab] ?? t.label }))}
          />
        </div>
      )}
      {current === 'questions' ? <FormSettings key="questions" embedded /> : <ApplicationSettings key="dates" embedded />}
    </div>
  );
}
