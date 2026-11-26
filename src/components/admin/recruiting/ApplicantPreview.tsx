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
// STEP 110: THE DEVICE LIES ON THE PAGE. No panel around it and no row of
// their pages beside it (the device is the applicant's workspace, to be
// used as they would): the design system's DeviceShowcase, with its one
// switch of computer, tablet and phone under it.
//
// STEP 108: AS A PRODUCT. Their workspace is shown live inside a computer,
// a tablet (either way up) or a phone, the supplied frames, each at the
// size that device really shows (ApplicantFrame, in a frame of that size,
// so the phone gets the phone's layout). The stages are a journey: a line
// that fills from Application received to Offer accepted (Not selected
// is the other ending), with Play to watch the workspace change stage by
// stage, and a note on the device each time their menu gains a page.
//
// OPEN TO every role that can open Candidates Screening, at the same
// level (SHARED_RESOURCES in the access matrix): a page that only shows,
// so reading it is all there is to do.
// =====================================================================
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Eye, Info, Loader2, Mail, Maximize2, Minimize2, MonitorSmartphone, Pause, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { DEVICES, PREVIEW_MESSAGE, PREVIEW_PAGE_MESSAGE, PREVIEW_READY_MESSAGE, deviceKeyOf, type DeviceFamily, type PreviewFrameMessage } from '@/lib/applicant-frame';
import { DeviceSwitch } from '@/components/shared/DeviceShowcase';
import { DeviceStage } from '@/components/admin/recruiting/DeviceStage';

/** The journey's main road, in order; "Not selected" is its other ending. */
const ROAD = PREVIEW_STAGES.filter((s) => s.id !== 'not-selected');
/** How long Play stays on each stage. */
const PLAY_STEP_MS = 3600;

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

  // THE DEVICE. A phone-sized screen starts on the phone; anything wider
  // on the computer.
  const [device, setDevice] = useState<DeviceFamily>(() =>
    (typeof window !== 'undefined' && window.innerWidth < 640 ? 'phone' : 'laptop'));
  const [upright, setUpright] = useState(false);
  // FULL SIZE: the device as large as the window allows, to click through
  // the applicant's pages comfortably. The page in the device reloads once
  // on the way in and once on the way out, at the stage and page shown.
  const [big, setBig] = useState(false);
  const deviceKey = deviceKeyOf(device, upright);
  // The width the device lays its page out at, told to the page inside
  // (Step 110), which checks it against what it is given.
  const width = DEVICES[deviceKey].viewport.width;

  // The applicant's workspace in the device: told the stage and the page,
  // and telling back when the applicant moves inside it.
  const frameRef = useRef<HTMLIFrameElement>(null);
  const post = useCallback((m: Omit<PreviewFrameMessage, 'type'>) => {
    frameRef.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE, ...m }, window.location.origin);
  }, []);

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

  // The device follows the stage and the page chosen here (and is told
  // them again whenever its page says it is ready)...
  const now = useRef({ stage, page, width });
  now.current = { stage, page, width };
  useEffect(() => { post({ stage, page, width }); }, [stage, page, width, post]);
  // ...and this page follows what the applicant does inside it.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      const m = e.data as PreviewFrameMessage;
      if (m?.type === PREVIEW_READY_MESSAGE) { post(now.current); return; }
      if (!m || m.type !== PREVIEW_PAGE_MESSAGE) return;
      if (m.stage && m.stage !== previewStage() && PREVIEW_STAGES.some((x) => x.id === m.stage)) setPreviewStage(m.stage as PreviewStage);
      if (m.page) setPage(m.page);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post]);

  // WHAT THE STAGE OPENED: a note on the device when their menu gains a page.
  const seenPages = useRef<string[] | null>(null);
  const [opened, setOpened] = useState<string[]>([]);
  useEffect(() => {
    const before = seenPages.current;
    seenPages.current = pages;
    if (!before) return;
    const added = pages.filter((p) => !before.includes(p));
    if (!added.length) return;
    setOpened(added);
    const t = window.setTimeout(() => setOpened([]), 3200);
    return () => window.clearTimeout(t);
  }, [pages]);

  // PLAY: the journey, stage by stage, from where it stands to the offer
  // accepted; any press of a stage stops it.
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const at = ROAD.findIndex((s) => s.id === stage);
    if (at < 0 || at >= ROAD.length - 1) { setPlaying(false); return; }
    const t = window.setTimeout(() => { setPreviewStage(ROAD[at + 1].id); setPage('applications-status'); }, PLAY_STEP_MS);
    return () => window.clearTimeout(t);
  }, [playing, stage]);
  const play = () => {
    if (playing) { setPlaying(false); return; }
    const at = ROAD.findIndex((s) => s.id === stage);
    if (at < 0 || at >= ROAD.length - 1) { setPreviewStage(ROAD[0].id); setPage('applications-status'); }
    setPlaying(true);
  };

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

  const choose = useCallback((s: PreviewStage) => { setPlaying(false); setPreviewStage(s); setPage('applications-status'); }, []);

  // The device with the note of a page just opened: on the page, or at full size.
  const stageView = (large: boolean) => (
    <DeviceStage device={deviceKey} page={page} start={{ stage, page }} frameRef={frameRef} onFrameLoad={() => post(now.current)} large={large}>
      {opened.length > 0 && (
        <div className="ap-toast pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 sm:top-6" role="status">
          <span className="inline-flex items-center gap-2 border border-accent/30 bg-background px-3.5 py-2 text-sm text-foreground shadow-[0_18px_40px_-18px_hsl(var(--overlay)/0.45)]">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
            New in their menu: <strong className="font-semibold text-accent">{opened.map((p) => PAGE_LABELS[p] ?? p).join(', ')}</strong>
          </span>
        </div>
      )}
    </DeviceStage>
  );

  if (!ready) return <WorkspaceLoader />;

  const stageInfo = PREVIEW_STAGES.find((s) => s.id === stage)!;
  const byKey = new Map((emails ?? []).map((e) => [e.key, e]));
  const groups: { title: string; rows: typeof APPLICANT_EMAILS }[] = [
    ...PREVIEW_STAGES.map((s) => ({ title: s.label, rows: APPLICANT_EMAILS.filter((e) => e.stage === s.id) })),
    { title: 'Other moments', rows: APPLICANT_EMAILS.filter((e) => e.stage === 'other') },
  ].filter((g) => g.rows.length > 0);
  // The group of the stage being looked at comes first.
  groups.sort((a, b) => Number(b.title === stageInfo.label) - Number(a.title === stageInfo.label));


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

      {/* THE JOURNEY: the stages as the road an applicant travels. The line
          fills to the stage shown; Play walks it, stage by stage. */}
      <div className="mb-4 rounded-xl border border-separator bg-background px-3 pb-3 pt-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl text-accent">Their journey</h2>
          <Button type="button" data-ro variant={playing ? 'default' : 'outline'} size="sm" className="h-11 lg:h-9" onClick={play} aria-pressed={playing}>
            {playing ? <Pause className="mr-1.5 h-4 w-4" aria-hidden="true" /> : <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {playing ? 'Pause' : stage === ROAD[ROAD.length - 1].id ? 'Play from the start' : 'Play the journey'}
          </Button>
        </div>
        <div role="tablist" aria-label="Stage of the application" className="ap-road relative -mx-1 overflow-x-auto px-1 pb-1">
          <ol className="relative flex min-w-[46rem] items-start">
            {/* The road, and how far along it the applicant is. */}
            {/* Eight equal columns: the road runs from the centre of the first
                to the centre of the seventh (75% of the width). */}
            <span aria-hidden="true" className="absolute left-[6.25%] top-[15px] h-[2px] w-[75%] bg-separator" />
            <span
              aria-hidden="true"
              className="ap-road-fill absolute left-[6.25%] top-[15px] h-[2px] bg-accent"
              style={{ width: `${(75 * Math.max(0, ROAD.findIndex((x) => x.id === stage))) / (ROAD.length - 1)}%` }}
            />
            {[...ROAD, ...PREVIEW_STAGES.filter((x) => x.id === 'not-selected')].map((s, i) => {
              const active = s.id === stage;
              const at = ROAD.findIndex((x) => x.id === stage);
              const passed = i < ROAD.length && at >= 0 && i < at;
              const ending = s.id === 'not-selected';
              return (
                <li key={s.id} className="relative flex flex-1 flex-col items-center px-1 text-center">
                  {ending && <span aria-hidden="true" className="absolute -left-1 top-[6px] text-xs text-muted-foreground">or</span>}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-ro
                    onClick={() => choose(s.id)}
                    className="group flex flex-col items-center gap-1.5 max-lg:min-h-11"
                  >
                    <span
                      className={`ap-node relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs tabular-nums transition-colors ${
                        active ? 'ap-node-active border-accent bg-accent text-accent-foreground'
                          : passed ? 'border-accent bg-background text-accent'
                          : ending ? 'border-dashed border-muted-foreground/50 bg-background text-muted-foreground group-hover:border-accent'
                          : 'border-separator bg-background text-muted-foreground group-hover:border-accent'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`max-w-[7.5rem] text-xs leading-snug ${active ? 'font-semibold text-accent' : 'text-foreground/80'}`}>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-3 border-t border-separator pt-3 text-sm text-muted-foreground" aria-live="polite">
          <span className="font-semibold text-foreground">{stageInfo.label}.</span> {stageInfo.note}
        </p>
      </div>

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
        <section aria-label="The applicant's workspace" className="pt-2">
          {big ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center text-sm text-muted-foreground">
              <Maximize2 className="h-5 w-5 text-accent" aria-hidden="true" />
              Their workspace is open at full size.
              <Button type="button" data-ro variant="outline" size="sm" className="h-11 lg:h-9" onClick={() => setBig(false)}>Back to this page</Button>
            </div>
          ) : stageView(false)}
          <DeviceSwitch family={device} upright={upright} onChange={setDevice} onRotate={() => setUpright((v) => !v)} onFullSize={() => setBig(true)} />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Their real pages, at the size this device shows them, with the sample applicant. Click through them as they would: nothing is saved or sent.
          </p>
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

      {/* Their workspace at full size, the device as large as the window. */}
      <Dialog open={big} onOpenChange={setBig}>
        <DialogContent className="flex h-[96dvh] w-[98vw] max-w-[98vw] flex-col gap-0 overflow-hidden p-0" data-ro>
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-separator px-4 py-2.5 pr-14 text-left">
            <div className="min-w-0">
              <DialogTitle className="font-serif text-lg">Their workspace, {stageInfo.label.toLowerCase()}</DialogTitle>
              <DialogDescription className="text-xs">Click through it as the applicant would; nothing is saved or sent.</DialogDescription>
            </div>
            <DeviceSwitch family={device} upright={upright} onChange={setDevice} onRotate={() => setUpright((v) => !v)} className="shrink-0" />
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">{big && stageView(true)}</div>
          <div className="flex shrink-0 justify-end border-t border-separator px-4 py-2">
            <Button type="button" data-ro variant="outline" size="sm" className="h-11 lg:h-9" onClick={() => setBig(false)}>
              <Minimize2 className="h-4 w-4" aria-hidden="true" />Back to the page
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
