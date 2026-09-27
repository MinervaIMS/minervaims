import { useEffect, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { Block } from './DashboardKit';
import {
  ONBOARDING_STEPS, stepState, whatsappLink,
  type LatestReport, type OnboardingMark, type OnboardingProgress, type OnboardingStep,
} from '@/lib/onboarding';
import type { OnboardingState } from './useOnboarding';

// =====================================================================
// Getting started: the new member's checklist, in the place of "Research
// by division" on the Dashboard while it is open. See src/lib/onboarding.ts
// for the five steps and how each one ticks itself.
//
// IT IS DECIDED BEFORE THE PAGE APPEARS. The Dashboard loads as one thing
// behind its loader, and the checklist is part of that load: a member
// never sees the research chart and then watches it turn into a list.
// When anything about it cannot be read, the chart is shown, as before.
//
// IT GOES AWAY ON ITS OWN. Once every step is done the card says so for
// the rest of that visit, and from the next one the chart is back. The
// member can also hide it at any moment, with an undo.
// =====================================================================

type Nav = (section: string, sub: string | null) => void;

const nowIso = () => new Date().toISOString();

const linkCls = 'text-accent underline-offset-2 hover:underline focus-visible:underline outline-none';

export function OnboardingChecklistBlock({ onboarding, onNavigate, canOpenArchive }: {
  onboarding: OnboardingState;
  onNavigate?: Nav;
  canOpenArchive: boolean;
}) {
  const { toast } = useToast();
  const { context, progress, reports, reportsOfDivision, save, progressRef } = onboarding;
  const [reportsOpen, setReportsOpen] = useState(false);
  const [selected, setSelected] = useState<OnboardingStep | null>(null);
  const items = progress.items;

  const states = useMemo(() => {
    const out = {} as Record<OnboardingStep, { done: boolean; auto: boolean }>;
    for (const s of ONBOARDING_STEPS) out[s] = context ? stepState(s, context, items) : { done: false, auto: false };
    return out;
  }, [context, items]);
  const doneCount = ONBOARDING_STEPS.filter((s) => states[s].done).length;
  const allDone = doneCount === ONBOARDING_STEPS.length;

  const fail = (e: unknown) => toast({
    title: 'Could not save the checklist', description: e instanceof Error ? e.message : undefined, variant: 'destructive',
  });

  // Every write starts from the latest saved state, so two quick clicks
  // never overwrite each other.
  const update = (change: (p: OnboardingProgress) => OnboardingProgress) => save(change(progressRef.current)).catch(fail);

  // Completing the last step is recorded once. The card stays for the
  // rest of this visit and is gone from the next one.
  useEffect(() => {
    if (allDone && !progressRef.current.completed_at) {
      save({ ...progressRef.current, completed_at: nowIso() }).catch(() => undefined);
    }
  }, [allDone, save, progressRef]);

  const tick = (step: OnboardingStep, on: boolean) => update((p) => {
    const next = { ...p.items };
    if (on) next[step] = nowIso(); else delete next[step];
    return { ...p, items: next, completed_at: on ? p.completed_at : null };
  });

  const mark = (m: OnboardingMark) => {
    if (progressRef.current.items[m]) return;
    update((p) => ({ ...p, items: { ...p.items, [m]: nowIso() } }));
  };

  const hide = () => {
    update((p) => ({ ...p, hidden_at: nowIso() }));
    toast({
      title: 'Checklist hidden',
      description: 'Research by division is back on your Dashboard.',
      action: (
        <ToastAction altText="Show the checklist again" onClick={() => update((p) => ({ ...p, hidden_at: null }))}>
          Undo
        </ToastAction>
      ),
    });
  };

  const openReport = (r: LatestReport) => {
    mark('opened_publication');
    setReportsOpen(false);
    window.open(r.file_url, '_blank', 'noopener');
  };

  if (!context) return null;
  const heads = context.heads;
  const names = heads.map((h) => h.name).join(' or ');
  const opened = <Check className="ml-0.5 inline h-3 w-3 align-[-1px] text-accent" aria-label="opened" />;
  const sep = <span className="text-muted-foreground/60" aria-hidden="true"> · </span>;

  const STEP: Record<OnboardingStep, { chip: string; title: string; text: string; actions: JSX.Element | null }> = {
    profile: {
      chip: 'Profile',
      title: 'Complete your profile and photo',
      text: 'Add your phone number and a professional photo. The Career tools turn a simple portrait into one on the Minerva background.',
      actions: (
        <>
          <button type="button" className={linkCls} onClick={() => onNavigate?.('my-role', null)}>My Profile</button>
          {sep}
          <button type="button" className={linkCls} onClick={() => onNavigate?.('career', 'career-linkedin')}>Photo tool in Career</button>
        </>
      ),
    },
    linkedin: {
      chip: 'LinkedIn',
      title: 'Add your LinkedIn',
      text: 'Save the link to your profile on My Profile, then refine the profile with the About prompt and the Minerva banner.',
      actions: (
        <>
          <button type="button" className={linkCls} onClick={() => onNavigate?.('my-role', null)}>My Profile</button>
          {sep}
          <button type="button" className={linkCls} onClick={() => onNavigate?.('career', 'career-linkedin')}>LinkedIn tools in Career</button>
        </>
      ),
    },
    reading: {
      chip: 'Reading',
      title: 'Read your role brief and the statute',
      text: 'What your role is responsible for, and the rules every member of the Society has agreed to.',
      actions: (
        <>
          <button type="button" className={linkCls} onClick={() => { mark('opened_role_brief'); onNavigate?.('my-role', null); }}>Your role brief</button>
          {items.opened_role_brief && opened}
          {sep}
          <a href="/statute" target="_blank" rel="noopener noreferrer" className={linkCls} onClick={() => mark('opened_statute')}>The statute</a>
          {items.opened_statute && opened}
        </>
      ),
    },
    head: {
      chip: 'Head',
      title: 'Introduce yourself to your Head of Division',
      text: heads.length
        ? `Write to ${names} to present yourself and to be added to your division's WhatsApp group.`
        : "Ask the Board who leads your division, present yourself and ask to be added to its WhatsApp group.",
      actions: heads.length ? (
        <>
          {heads.map((h, i) => {
            const wa = whatsappLink(h.phone);
            const who = heads.length > 1 ? ` ${h.name.split(' ')[0]}` : '';
            return (
              <span key={`${h.name}-${i}`}>
                {i > 0 && sep}
                {h.email && <a href={`mailto:${h.email}`} className={linkCls}>Email{who}</a>}
                {h.email && wa && sep}
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={linkCls}>WhatsApp{who}</a>}
              </span>
            );
          })}
        </>
      ) : null,
    },
    publications: {
      chip: 'Reports',
      title: 'Read the latest publications of your division',
      text: reportsOfDivision || !reports.length
        ? 'The quickest way to see the standard of the work you are joining.'
        : 'Your division has not published yet, so here are the latest reports of the Society.',
      actions: (
        <>
          <Popover open={reportsOpen} onOpenChange={setReportsOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={linkCls} disabled={!reports.length}>
                {reports.length ? 'Choose a report' : 'None published yet'}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-2 font-body">
              <p className="px-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {reportsOfDivision ? 'Latest from your division' : 'Latest from the Society'}
              </p>
              <ul className="space-y-1">
                {reports.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => openReport(r)}
                      className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted outline-none">
                      <span className="block font-serif text-[15px] leading-snug text-accent">{r.title}</span>
                      {r.date && (
                        <span className="block text-[11px] text-muted-foreground">
                          {new Date(`${r.date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {canOpenArchive && (
                <button type="button" className={`${linkCls} mt-1 block px-2 py-1 text-xs`}
                  onClick={() => { setReportsOpen(false); onNavigate?.('reports', 'reports-archive'); }}>
                  Everything in the Report Archive
                </button>
              )}
            </PopoverContent>
          </Popover>
          {items.opened_publication && opened}
        </>
      ),
    },
  };

  const current = selected ?? ONBOARDING_STEPS.find((st) => !states[st].done) ?? ONBOARDING_STEPS[0];
  const cur = STEP[current];
  const curState = states[current];

  return (
    <Block
      title="Getting started"
      aside={(
        <span className="inline-flex items-center gap-3 text-[12px]">
          <span className="tabular-nums">{doneCount} of {ONBOARDING_STEPS.length} done</span>
          <HelpDot page="dashboard" topic="getting-started" />
          {!allDone && <button type="button" className={linkCls} onClick={hide}>Hide</button>}
        </span>
      )}
    >
      {allDone ? (
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="font-serif text-2xl text-accent">You are all set</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Welcome to Minerva. From your next visit, this place shows Research by division again.
          </p>
          <Button variant="outline" size="sm" className="mt-1" onClick={hide}>Hide now</Button>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          {/* The five steps, in order, left to right. A step done is filled;
              the one shown below is ringed. The first step still open is the
              one shown when the page opens. */}
          <div className="shrink-0 grid grid-cols-5 gap-1.5" role="tablist" aria-label="Getting started steps">
            {ONBOARDING_STEPS.map((st) => {
              const d = states[st].done;
              const on = st === current;
              return (
                <button
                  key={st} type="button" role="tab" aria-selected={on} title={STEP[st].title}
                  onClick={() => setSelected(st)}
                  className={`flex min-w-0 items-center justify-center gap-1 rounded-md border px-1 py-1.5 text-[11.5px] leading-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-soft ${
                    d ? 'border-accent bg-accent text-accent-foreground' : 'border-separator bg-background text-foreground hover:border-accent/60'
                  } ${on ? 'ring-2 ring-accent/35 ring-offset-1 ring-offset-background' : ''}`}
                >
                  {d && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  <span className="truncate">{STEP[st].chip}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-1 min-h-0 flex-col" role="tabpanel">
            <p className="shrink-0 font-serif text-[17px] leading-tight text-accent">{cur.title}</p>
            <p className="mt-1 min-h-0 overflow-hidden text-[12.5px] leading-snug text-muted-foreground line-clamp-3">{cur.text}</p>
            <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-2">
              <p className="text-[12.5px]">{cur.actions}</p>
              <label className={`inline-flex items-center gap-2 text-[12.5px] ${curState.auto ? 'text-muted-foreground' : 'text-foreground cursor-pointer'}`}>
                <Checkbox
                  checked={curState.done}
                  disabled={curState.auto}
                  onCheckedChange={(v) => { tick(current, v === true); if (v === true) setSelected(null); }}
                />
                {curState.auto ? 'Done, the workspace can see it' : 'Done'}
              </label>
            </div>
          </div>
        </div>
      )}
    </Block>
  );
}

export default OnboardingChecklistBlock;
