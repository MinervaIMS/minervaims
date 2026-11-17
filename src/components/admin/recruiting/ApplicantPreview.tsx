// =====================================================================
// RECRUITING, APPLICANT PREVIEW (Step 106).
// ---------------------------------------------------------------------
// What an applicant sees and receives, at every stage, shown with a
// SAMPLE applicant ("Michael Burry"): the recruiting roles can check the
// applicant's side of the process without asking anybody to apply.
//
//   Their workspace  the applicant's real pages (Status, Interview, Phone
//                    Call, Offer, Profile, FAQs), drawn by the very
//                    components applicants use, with the pages their
//                    stage has opened and no others. Booking a slot,
//                    answering the offer or withdrawing works, and moves
//                    the sample on, but in this browser only.
//   Their emails     every email an applicant receives, as the database
//                    sends it (the stored copy), filled for the sample,
//                    grouped by the stage it is sent at, with its plain
//                    text part. Read through the `applicant-preview`
//                    function, which sends and writes nothing.
//
// The sample's data lives in lib/applicant-preview.ts; while this page is
// open, the applicant's data functions answer from it.
//
// OPEN TO every role that can open Candidates Screening, at the same
// level (SHARED_RESOURCES in the access matrix): a page that only shows,
// so reading it is all there is to do.
// =====================================================================
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Eye, Info, Loader2, Mail, MonitorSmartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useAuth } from '@/contexts/AuthContext';
import { invokeFunction } from '@/lib/errors';
import { candidateNav } from '@/lib/workspace-nav';
import { hasOffer, isInvitedToCall, isInvitedToInterview } from '@/lib/applications-api';
import { refreshMyApplication, resetMyApplication } from '@/hooks/useMyApplication';
import {
  APPLICANT_EMAILS, PREVIEW_STAGES, applicantPreview, previewStage, setPreviewStage, startApplicantPreview,
  stopApplicantPreview, subscribeApplicantPreview, type PreviewStage,
} from '@/lib/applicant-preview';

const ApplicationStatus = lazy(() => import('@/components/admin/ApplicationStatus'));
const InterviewCalendarCandidate = lazy(() => import('@/components/admin/InterviewCalendarCandidate'));
const CallCandidate = lazy(() => import('@/components/admin/CallCandidate'));
const CandidateOffer = lazy(() => import('@/components/admin/CandidateOffer'));
const CandidateFaqs = lazy(() => import('@/components/admin/CandidateFaqs'));
const ApplicantProfile = lazy(() => import('@/components/admin/profile/ApplicantProfile'));

interface PreviewEmail {
  key: string;
  name?: string;
  subject?: string;
  html?: string;
  text?: string;
  connected?: boolean;
  missing?: boolean;
}

/** The label of each applicant page, as the applicant's menu names it. */
const PAGE_LABELS: Record<string, string> = {
  'applications-status': 'Status',
  'applications-interview': 'Interview',
  'applications-call': 'Phone Call',
  'applications-offer': 'Offer',
  'my-role': 'Profile',
  'applications-faqs': 'FAQs',
};

export default function ApplicantPreview() {
  const { session } = useAuth();
  // The preview runs while this page is open, and only then.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    startApplicantPreview('received');
    resetMyApplication();
    setReady(true);
    return () => {
      stopApplicantPreview();
      resetMyApplication();
    };
  }, []);

  // Every change of the sample (a stage chosen here, a slot booked on the
  // applicant's page) re-reads the application and redraws the page shown.
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeApplicantPreview(() => {
    setVersion((v) => v + 1);
    if (applicantPreview()) void refreshMyApplication();
  }), []);
  const stage = useSyncExternalStore(subscribeApplicantPreview, () => previewStage() ?? 'received', () => 'received') as PreviewStage;

  const [tab, setTab] = useState<'workspace' | 'emails'>('workspace');
  const [page, setPage] = useState<string>('applications-status');

  // The pages this stage has opened, from the applicant's own navigation.
  const pages = useMemo(() => {
    const preview = applicantPreview();
    if (!preview) return ['applications-status', 'my-role', 'applications-faqs'];
    const app = preview.application();
    const nav = candidateNav({ invited: isInvitedToInterview(app), called: isInvitedToCall(app), offered: hasOffer(app) });
    const subs = nav.find((s) => s.key === 'applications')?.subItems.map((s) => s.key) ?? [];
    return [...subs, 'my-role', 'applications-faqs'];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ready]);
  useEffect(() => { if (!pages.includes(page)) setPage('applications-status'); }, [pages, page]);

  // The emails, read once.
  const [emails, setEmails] = useState<PreviewEmail[] | null>(null);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  useEffect(() => {
    if (tab !== 'emails' || emails) return;
    let live = true;
    invokeFunction('applicant-preview', { body: {}, session })
      .then((data: { emails?: PreviewEmail[] }) => { if (live) setEmails(data?.emails ?? []); })
      .catch((e: unknown) => { if (live) setEmailsError(e instanceof Error ? e.message : 'The emails could not be read just now.'); });
    return () => { live = false; };
  }, [tab, emails, session]);
  const [open, setOpen] = useState<PreviewEmail | null>(null);
  const [asText, setAsText] = useState(false);

  const choose = useCallback((s: PreviewStage) => { setPreviewStage(s); setPage('applications-status'); }, []);
  const goPage = useCallback((p: string) => { if (pages.includes(p)) setPage(p); }, [pages]);

  if (!ready) return <WorkspaceLoader />;

  const stageInfo = PREVIEW_STAGES.find((s) => s.id === stage)!;
  const byKey = new Map((emails ?? []).map((e) => [e.key, e]));
  const groups: { title: string; rows: typeof APPLICANT_EMAILS }[] = [
    ...PREVIEW_STAGES.map((s) => ({ title: s.label, rows: APPLICANT_EMAILS.filter((e) => e.stage === s.id) })),
    { title: 'Other moments', rows: APPLICANT_EMAILS.filter((e) => e.stage === 'other') },
  ].filter((g) => g.rows.length > 0);
  // The group of the stage being looked at comes first.
  groups.sort((a, b) => Number(b.title === stageInfo.label) - Number(a.title === stageInfo.label));

  const pageView = (() => {
    const k = `${page}-${version}`;
    switch (page) {
      case 'applications-status': return <ApplicationStatus key={k} onOpenOffer={() => goPage('applications-offer')} onOpenPage={(p) => goPage(p)} />;
      case 'applications-interview': return <InterviewCalendarCandidate key={k} />;
      case 'applications-call': return <CallCandidate key={k} />;
      case 'applications-offer': return <CandidateOffer key={k} />;
      case 'applications-faqs': return <CandidateFaqs key={k} />;
      default: return <ApplicantProfile key={k} app={applicantPreview()?.application() ?? null} email="michael.burry@example.com" session={session} />;
    }
  })();

  return (
    <div className="font-body">
      <WorkspacePageHeader
        title="Applicant Preview"
        description="What an applicant sees in their workspace and receives by email, at every stage, shown with a sample applicant."
      />

      {/* What this is, in one box. */}
      <div className="mb-5 flex gap-3 rounded-xl border border-accent/30 bg-accent/[0.04] px-4 py-3.5 text-[15px] leading-relaxed text-foreground/85">
        <Info className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <p>
          The applicant is a sample, <strong>Michael Burry</strong>, applying to Equity Research, with a sample CV and written answer
          (the two documents the application form asks for). Choose a stage to see their pages and emails at that point.
          You can book a slot, answer the offer or withdraw as they would: <strong>nothing is saved or sent</strong>, and only this page changes.
        </p>
      </div>

      {/* The stages. */}
      <div role="tablist" aria-label="Stage of the application" className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-2">
        {PREVIEW_STAGES.map((s, i) => {
          const active = s.id === stage;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-ro
              onClick={() => choose(s.id)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition-colors max-lg:min-h-11 ${active ? 'border-accent bg-accent text-accent-foreground' : 'border-separator bg-background text-foreground hover:border-accent'}`}
            >
              <span className={`mr-1.5 tabular-nums ${active ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>{i + 1}</span>{s.label}
            </button>
          );
        })}
      </div>
      <p className="mb-5 text-sm text-muted-foreground">{stageInfo.note}</p>

      {/* Their workspace, or their emails. */}
      <div className="mb-4 inline-flex rounded-lg border border-separator p-1" role="tablist" aria-label="What to show">
        {([['workspace', 'Their workspace', MonitorSmartphone], ['emails', 'Their emails', Mail]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-ro
            onClick={() => setTab(id)}
            className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm transition-colors max-lg:h-11 ${tab === id ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted'}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      {tab === 'workspace' ? (
        <section aria-label="The applicant's workspace" className="rounded-xl border border-separator">
          {/* The applicant's own menu at this stage: only what it opens. */}
          <div className="flex flex-wrap items-center gap-2 border-b border-separator bg-muted/30 px-3 py-2">
            <span className="mr-1 text-xs uppercase tracking-wider text-muted-foreground">Their menu</span>
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                data-ro
                aria-current={p === page ? 'page' : undefined}
                onClick={() => setPage(p)}
                className={`h-9 border px-3 text-sm transition-colors max-lg:h-11 ${p === page ? 'border-accent bg-accent text-accent-foreground' : 'border-accent/40 bg-background text-accent hover:border-accent'}`}
              >
                {PAGE_LABELS[p] ?? p}
              </button>
            ))}
          </div>
          <div className="p-4 sm:p-6" data-applicant-preview-page={page}>
            <Suspense fallback={<WorkspaceLoader />}>{pageView}</Suspense>
          </div>
        </section>
      ) : (
        <section aria-label="The applicant's emails" className="space-y-5">
          {emailsError ? (
            <p className="rounded-xl border border-separator px-4 py-6 text-center text-sm text-muted-foreground">{emailsError}</p>
          ) : !emails ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Preparing the emails</div>
          ) : (
            groups.map((g) => (
              <div key={g.title} className="rounded-xl border border-separator">
                <h3 className={`border-b border-separator px-4 py-2.5 font-serif text-lg ${g.title === stageInfo.label ? 'text-accent' : 'text-foreground'}`}>{g.title}</h3>
                <ul className="divide-y divide-separator">
                  {g.rows.map((row) => {
                    const e = byKey.get(row.key);
                    return (
                      <li key={row.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="text-[15px] text-foreground">{e?.subject || e?.name || row.key}</p>
                          <p className="text-sm text-muted-foreground">{row.when}{e && e.connected === false ? ' Switched off at the moment, so not sent.' : ''}</p>
                        </div>
                        {e?.html ? (
                          <Button data-ro variant="outline" size="sm" className="h-11 shrink-0 sm:h-9" onClick={() => { setAsText(false); setOpen(e); }}>
                            <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />See the email
                          </Button>
                        ) : (
                          <span className="shrink-0 text-xs text-muted-foreground">Not stored yet</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>
      )}

      {/* One email, as it arrives. The frame runs no script and follows no
          link: it shows the email, it cannot act on it. */}
      <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-3" data-ro>
          <DialogHeader>
            <DialogTitle className="font-serif">{open?.subject}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>To Michael Burry, michael.burry@example.com</span>
            <div className="inline-flex rounded-md border border-separator p-0.5">
              <button type="button" data-ro onClick={() => setAsText(false)} className={`h-8 rounded px-3 ${!asText ? 'bg-accent text-accent-foreground' : ''}`}>As designed</button>
              <button type="button" data-ro onClick={() => setAsText(true)} className={`h-8 rounded px-3 ${asText ? 'bg-accent text-accent-foreground' : ''}`}>Plain text</button>
            </div>
          </div>
          {open && (asText ? (
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-md border border-separator bg-muted/30 p-4 font-body text-sm text-foreground">{open.text}</pre>
          ) : (
            <iframe
              title={`Email: ${open.subject ?? open.key}`}
              sandbox=""
              srcDoc={open.html}
              className="min-h-[480px] w-full flex-1 rounded-md border border-separator bg-white"
            />
          ))}
          <p className="text-xs text-muted-foreground">The stored copy the workspace sends, filled with the sample applicant. Links are shown, not followed.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
