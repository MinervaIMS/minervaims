import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Helmet } from 'react-helmet-async';
import logoWhite from '@/assets/logo-white.svg';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { candidateNav } from '@/lib/workspace-nav';
import { hasOffer, isInvitedToCall, isInvitedToInterview } from '@/lib/applications-api';
import { refreshMyApplication, resetMyApplication } from '@/hooks/useMyApplication';
import {
  PREVIEW_STAGES, applicantPreview, previewStage, setPreviewStage, startApplicantPreview,
  stopApplicantPreview, subscribeApplicantPreview, type PreviewStage,
} from '@/lib/applicant-preview';
import { PREVIEW_MESSAGE, PREVIEW_PAGE_MESSAGE, PREVIEW_READY_MESSAGE, type PreviewFrameMessage } from '@/lib/applicant-frame';
import MobileWorkspaceShell from '@/components/admin/MobileWorkspaceShell';
import { WorkspaceIdentity } from '@/components/admin/WorkspaceIdentity';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';

const ApplicationStatus = lazy(() => import('@/components/admin/ApplicationStatus'));
const InterviewCalendarCandidate = lazy(() => import('@/components/admin/InterviewCalendarCandidate'));
const CallCandidate = lazy(() => import('@/components/admin/CallCandidate'));
const CandidateOffer = lazy(() => import('@/components/admin/CandidateOffer'));
const CandidateFaqs = lazy(() => import('@/components/admin/CandidateFaqs'));
const ApplicantProfile = lazy(() => import('@/components/admin/profile/ApplicantProfile'));

// =====================================================================
// THE APPLICANT'S WORKSPACE, INSIDE A DEVICE (Step 108).
// ---------------------------------------------------------------------
// Recruiting > Applicant Preview shows the applicant's workspace in a
// computer, a tablet and a phone. Each is this page, in a frame the size
// of that device's screen, so the phone gets the phone's own layout (the
// bottom bar, the drawer) and the computer the sidebar, exactly as the
// applicant's device would draw them: a page scaled down from a computer
// would not.
//
// It is the preview's, and only the preview's: the sample applicant
// ("Michael Burry"), whose data functions answer from
// lib/applicant-preview.ts before any server call, so nothing is read,
// booked or sent for anybody. It opens only for the roles that can open
// the preview (Candidates Screening), and the stage and the page are
// set by the preview page around it (window messages, same origin only).
// =====================================================================

const LABELS: Record<string, string> = {
  'applications-status': 'Status',
  'applications-interview': 'Interview',
  'applications-call': 'Phone Call',
  'applications-offer': 'Offer',
  'applications-faqs': 'FAQs',
  'my-role': 'My Profile',
};

function readStage(raw: string | null): PreviewStage {
  return (PREVIEW_STAGES.find((s) => s.id === raw)?.id ?? 'received') as PreviewStage;
}

export default function ApplicantFrame() {
  const { session, user, rolesLoaded, isLoading } = useAuth();
  const { canView } = useAccess();
  const allowed = !!user && canView('applications-preview');

  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!allowed) return;
    startApplicantPreview(readStage(query.get('stage')));
    resetMyApplication();
    setReady(true);
    return () => { stopApplicantPreview(); resetMyApplication(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const [version, setVersion] = useState(0);
  useEffect(() => subscribeApplicantPreview(() => {
    setVersion((v) => v + 1);
    if (applicantPreview()) void refreshMyApplication();
  }), []);
  const stage = useSyncExternalStore(subscribeApplicantPreview, () => previewStage() ?? 'received', () => 'received') as PreviewStage;

  const [page, setPage] = useState<string>(query.get('page') || 'applications-status');

  // The applicant's own navigation at this stage: only what it opens.
  const nav = useMemo(() => {
    const preview = applicantPreview();
    const app = preview?.application() ?? null;
    return candidateNav({ invited: isInvitedToInterview(app), called: isInvitedToCall(app), offered: hasOffer(app) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ready]);
  const pages = useMemo(() => [
    ...(nav.find((s) => s.key === 'applications')?.subItems.map((s) => s.key) ?? []), 'my-role',
  ], [nav]);
  useEffect(() => { if (ready && !pages.includes(page)) setPage('applications-status'); }, [pages, page, ready]);

  // The preview page sets the stage and the page; this one tells it when
  // the applicant moves (a slot booked, a page opened). THE HANDSHAKE: once
  // the sample is running this page says it is ready, and it reports back
  // only after the preview page has told it where things stand, so a page
  // just loaded can never pull the preview back to its own first stage.
  const synced = useRef(false);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const m = e.data as PreviewFrameMessage;
      if (!m || m.type !== PREVIEW_MESSAGE) return;
      synced.current = true;
      if (m.stage && m.stage !== previewStage()) setPreviewStage(readStage(m.stage));
      if (m.page) setPage(m.page);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => {
    if (!ready || window.parent === window) return;
    window.parent.postMessage({ type: PREVIEW_READY_MESSAGE }, window.location.origin);
  }, [ready]);
  useEffect(() => {
    if (!ready || !synced.current || window.parent === window) return;
    window.parent.postMessage({ type: PREVIEW_PAGE_MESSAGE, page, stage }, window.location.origin);
  }, [page, stage, ready]);

  const go = useCallback((p: string) => { if (pages.includes(p)) setPage(p); }, [pages]);

  // A phone or a tablet held upright gets the phone layout, as the
  // applicant's own device would.
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 1024);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  if (isLoading || (user && !rolesLoaded)) return <WorkspaceLoader />;
  if (!allowed) {
    return <p className="p-8 text-center font-body text-muted-foreground">The applicant preview opens from Recruiting, Applicant Preview.</p>;
  }
  if (!ready) return <WorkspaceLoader />;

  const k = `${page}-${version}`;
  const view = (() => {
    switch (page) {
      case 'applications-status': return <ApplicationStatus key={k} onOpenOffer={() => go('applications-offer')} onOpenPage={(p) => go(p)} />;
      case 'applications-interview': return <InterviewCalendarCandidate key={k} />;
      case 'applications-call': return <CallCandidate key={k} />;
      case 'applications-offer': return <CandidateOffer key={k} />;
      case 'applications-faqs': return <CandidateFaqs key={k} />;
      default: return <ApplicantProfile key={k} app={applicantPreview()?.application() ?? null} email="michael.burry@example.com" session={session} />;
    }
  })();
  // Each page, and each stage of it, settles in (none under reduced motion).
  const content = <Suspense fallback={<WorkspaceLoader />}><div key={`${page}-${stage}`} className="ap-page-in" data-applicant-preview-page={page}>{view}</div></Suspense>;
  const sectionOf = (p: string) => (p === 'my-role' ? 'my-role' : 'applications');

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      {narrow ? (
        <MobileWorkspaceShell
          nav={nav}
          activeSectionKey={sectionOf(page)}
          activeSubKey={page === 'my-role' ? null : page}
          onSearch={() => undefined}
          onNavigate={(section, sub) => go(sub ?? (section === 'my-role' ? 'my-role' : 'applications-status'))}
          roleLabel="Candidate"
          email="michael.burry@example.com"
          name="Michael Burry"
          onWebsite={() => undefined}
          onSignOut={() => undefined}
          applicant
        >
          {content}
        </MobileWorkspaceShell>
      ) : (
        <div className="flex h-screen w-full overflow-hidden bg-background font-body">
          <aside className="flex w-[220px] shrink-0 flex-col bg-accent text-accent-foreground">
            <div className="flex h-20 items-center justify-center">
              <img src={logoWhite} alt="Minerva" className="h-14 w-14" />
            </div>
            <nav className="py-3" aria-label="The applicant's menu">
              {nav.map((section) => (
                <div key={section.key}>
                  <button
                    type="button"
                    onClick={() => go(section.key === 'my-role' ? 'my-role' : 'applications-status')}
                    className={`flex h-12 w-full items-center gap-3 px-4 text-left text-lg ${sectionOf(page) === section.key ? 'bg-background/15' : 'hover:bg-background/10'}`}
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    <section.Icon className="h-5 w-5 shrink-0" />{section.label}
                  </button>
                  {section.key === 'applications' && sectionOf(page) === 'applications' && (
                    <div className="pb-2">
                      {section.subItems.map((si) => (
                        <button
                          key={si.key}
                          type="button"
                          aria-current={si.key === page ? 'page' : undefined}
                          onClick={() => go(si.key)}
                          className={`flex h-9 w-full items-center pl-12 pr-3 text-left text-[15px] ${si.key === page ? 'bg-background/20 text-accent-foreground' : 'text-accent-foreground/75 hover:text-accent-foreground'}`}
                        >
                          {LABELS[si.key] ?? si.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-20 shrink-0 items-center border-b border-separator bg-muted/40 px-6">
              <div className="min-w-0 max-w-[26rem] flex-1">
                <WorkspaceIdentity name="Michael Burry" roleLabel="Candidate" email="michael.burry@example.com" photoUrl={null} />
              </div>
            </div>
            <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
              <p className="mb-4 text-xs text-muted-foreground">Minerva Workspace / {sectionOf(page) === 'my-role' ? 'My Profile' : `My Application / ${LABELS[page] ?? ''}`}</p>
              {content}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
