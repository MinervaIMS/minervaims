// =====================================================================
// /forms/:id: one of the Society's forms, answered by a member or a guest.
// ---------------------------------------------------------------------
// The same navy stage and white card as event registration, so the
// Society's forms look like one family. One column, the label above each
// field, the requirement said in words, every error under its question
// and summarised at the top with links when sending fails. After sending,
// the person is told plainly that it worked, that a receipt is on its way
// and, where the form allows it, how long they can still change their
// answers. A closed form says when it closed and shows what they sent.
//
// WHO ANSWERS. A form is for members (signed in, as before), for guests
// (anyone with the link, who gives a name and an email), or for both. A
// guest's receipt carries a private link (?r=...), the only way back to
// their answer; the page keeps it in the address once they have sent, so
// a reload still shows what they sent. Signed out on a members-only form,
// the page asks them to sign in.
//
// MORE THAN ONE. When the form allows it, "Want another one?" under the
// questions adds the questions of one item again (a second hoodie, a
// third), up to the form's limit, each with its own Remove. The total
// counts every item.
//
// A cover picture, if the form has one, heads the card. Questions shown
// only for some answers appear and disappear as the person answers, and
// the numbering follows what is shown.
// =====================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, CalendarClock, CheckCircle2, CreditCard, Loader2, Lock, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { useHideSiteFooter } from '@/components/layout/ChromeContext';
import { EventCardShell } from '@/components/events/EventCardShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { FieldInput, ImageZoom } from '@/components/forms/FieldInput';
import {
  allItems, amountDue, answerText, eur, firstItem, hasPrices, isQuestion, itemsMaxOf, moreItems, MORE_KEY, repeats,
  validateAnswers, visibleIds, withItems,
  type AnswerValue, type Answers, type FormField,
} from '@/lib/internal-forms-rules';
import { noteAnswered } from '@/components/admin/dashboard/useMyForms';
import {
  fillGet, guestGet, guestSubmit, submitAnswers, uploadFormFile,
  type FillGet, type GuestResponse, type MemberForm, type MyResponse,
} from '@/lib/internal-forms-api';
import { countOf, deadlineRelative, deadlineText, money } from '@/components/admin/forms/forms-model';
import { WORKSPACE_BASE } from '@/lib/workspace-base';

type Mode =
  | { kind: 'member'; data: FillGet }
  | { kind: 'guest'; form: MemberForm; response: GuestResponse | null; images: Record<string, string> }
  | { kind: 'members-only'; title: string };

/** The DOM id of a question in an extra item: never the same as the first item's. */
const itemFieldId = (f: FormField, i: number) => `${f.id}--item${i + 2}`;

/** What someone sent, item by item when there are several. */
function SentAnswers({ fields, answers, files, label }: { fields: FormField[]; answers: Answers; files: Record<string, string>; label: string }) {
  const items = allItems(fields, answers);
  const row = (f: FormField, v: AnswerValue | undefined, key: string) => (
    <div key={key} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</dt>
      <dd className="whitespace-pre-wrap break-words text-[15px]">
        {f.type === 'file' && Array.isArray(v)
          ? (v as { path: string; name: string }[]).map((x) => (files[x.path] ? <a key={x.path} href={files[x.path]} target="_blank" rel="noopener noreferrer" className="mr-3 text-accent underline underline-offset-2">{x.name}</a> : <span key={x.path} className="mr-3">{x.name}</span>))
          : answerText(f, v) || <span className="text-muted-foreground">No answer</span>}
      </dd>
    </div>
  );
  if (items.length <= 1) {
    const shown = visibleIds(fields, answers);
    return <dl className="divide-y divide-separator border-y-2 border-y-accent">{fields.filter((f) => isQuestion(f) && shown.has(f.id)).map((f) => row(f, answers[f.id], f.id))}</dl>;
  }
  const once = fields.filter((f) => isQuestion(f) && !repeats(f) && visibleIds(fields, items[0]).has(f.id));
  return (
    <div className="space-y-4">
      {items.map((it, i) => {
        const shown = visibleIds(fields, it);
        return (
          <section key={i} aria-label={`${label} ${i + 1}`}>
            <h3 className="mb-1 font-serif text-lg text-accent">{label} {i + 1}</h3>
            <dl className="divide-y divide-separator border-y border-y-accent/60">{fields.filter((f) => repeats(f) && shown.has(f.id)).map((f) => row(f, it[f.id], `${i}-${f.id}`))}</dl>
          </section>
        );
      })}
      {once.length > 0 && <dl className="divide-y divide-separator border-y-2 border-y-accent">{once.map((f) => row(f, items[0][f.id], f.id))}</dl>}
    </div>
  );
}

export default function InternalFormPage() {
  useHideSiteFooter();
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useSearchParams();
  const token = search.get('r');
  const { user, session, profile, isLoading } = useAuth();
  const [mode, setMode] = useState<Mode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | { emailed: boolean; changed: boolean; to: string }>(null);
  const [editing, setEditing] = useState(false);
  const [zoomCover, setZoomCover] = useState(false);
  // A guest's name and email, and the field robots fill in and people never see.
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [website, setWebsite] = useState('');
  const summaryRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      // A private link opens the guest's own answer, signed in or not.
      if (!token && session) {
        const d = await fillGet(session, id);
        if (!('guest' in d)) {
          setMode({ kind: 'member', data: d });
          setAnswers((d.response?.answers ?? {}) as Answers);
          setLoadError(null);
          return;
        }
      }
      const g = await guestGet(id, token);
      if ('members_only' in g) { setMode({ kind: 'members-only', title: g.title }); setLoadError(null); return; }
      setMode({ kind: 'guest', form: g.form, response: g.response, images: g.images ?? {} });
      setAnswers((g.response?.answers ?? {}) as Answers);
      if (g.response) { setGuestName(g.response.name ?? ''); setGuestEmail(g.response.email ?? ''); }
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'This form could not be opened.');
    }
  }, [id, session, token]);

  useEffect(() => { if (!isLoading) load(); }, [isLoading, load]);
  // A signed-in guest starts with their own name and address.
  useEffect(() => {
    if (mode?.kind !== 'guest' || mode.response) return;
    setGuestName((n) => n || profile?.full_name || '');
    setGuestEmail((e) => e || user?.email || '');
  }, [mode, profile, user]);

  const guest = mode?.kind === 'guest';
  const form: MemberForm | null = mode?.kind === 'member' ? mode.data.form : mode?.kind === 'guest' ? mode.form : null;
  const response: MyResponse | GuestResponse | null = mode?.kind === 'member' ? mode.data.response : mode?.kind === 'guest' ? mode.response : null;
  // An organiser previewing a draft for guests only sees it as a guest will.
  const guestLook = guest || (form?.state === 'draft' && form.audience === 'external');
  const fields = useMemo(() => {
    const all = form?.fields ?? [];
    return guestLook && !guest ? all.filter((f) => f.type !== 'file') : all;
  }, [form, guestLook, guest]);
  const itemsMax = itemsMaxOf(form?.items_max);
  const itemLabel = (form?.item_label || '').trim() || 'Item';
  const first = useMemo(() => firstItem(answers), [answers]);
  const extra = useMemo(() => moreItems(answers), [answers]);
  const repeated = useMemo(() => fields.filter(repeats), [fields]);
  // What is shown follows the person's own answers (show-if rules).
  const shown = useMemo(() => visibleIds(fields, first), [fields, first]);
  const questions = useMemo(() => fields.filter((f) => isQuestion(f) && shown.has(f.id)), [fields, shown]);
  const images = mode?.kind === 'member' ? mode.data.images ?? {} : mode?.kind === 'guest' ? mode.images : {};
  const files = mode?.kind === 'member' ? mode.data.files : {};
  const priced = hasPrices(fields);
  // The running total: what would be kept if sent now, every item included.
  const liveTotal = useMemo(() => {
    if (!form) return null;
    return amountDue(form.track_payments, form.payment_amount, fields, validateAnswers(fields, answers, undefined, itemsMax).answers);
  }, [form, fields, answers, itemsMax]);
  const answeredBefore = !!response;
  const open = form?.state === 'open';
  const preview = form?.state === 'draft';
  const canAnswer = guest ? true : mode?.kind === 'member' ? mode.data.me.can_answer : false;
  const canSend = canAnswer && open && (!answeredBefore || form?.allow_edits || false);
  // The questions show while there is something to do with them: a first
  // answer, a change being made, or an organiser's preview.
  const showForm = !!form && (preview || (open && (!answeredBefore || editing)));

  const clearError = (key: string) => { if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; }); };
  const setAnswer = (fieldId: string, v: AnswerValue | undefined) => {
    setAnswers((a) => {
      const next = firstItem(a);
      if (v === undefined) delete next[fieldId]; else next[fieldId] = v;
      return withItems(next, moreItems(a));
    });
    clearError(fieldId);
  };
  const setItemAnswer = (i: number, fieldId: string, v: AnswerValue | undefined) => {
    setAnswers((a) => {
      const more = moreItems(a).map((m) => ({ ...m }));
      while (more.length <= i) more.push({});
      if (v === undefined) delete more[i][fieldId]; else more[i][fieldId] = v;
      return withItems(firstItem(a), more);
    });
    clearError(`${MORE_KEY}.${i}.${fieldId}`);
  };
  const addItem = () => {
    setAnswers((a) => withItems(firstItem(a), [...moreItems(a), {}]));
    const n = extra.length;
    requestAnimationFrame(() => document.getElementById(`item-${n + 2}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };
  const removeItem = (i: number) => {
    setAnswers((a) => withItems(firstItem(a), moreItems(a).filter((_, k) => k !== i)));
    // Errors of the later items move up with them.
    setErrors((e) => {
      const n: Record<string, string> = {};
      for (const [k, v] of Object.entries(e)) {
        const m = k.match(/^\+items\.(\d+)\.(.+)$/);
        if (!m) { n[k] = v; continue; }
        const at = Number(m[1]);
        if (at < i) n[k] = v; else if (at > i) n[`${MORE_KEY}.${at - 1}.${m[2]}`] = v;
      }
      return n;
    });
  };

  /** Each error with the question it belongs to, in the order of the page. */
  const errorList = useMemo(() => {
    const out: { key: string; anchor: string; label: string; text: string }[] = [];
    if (errors['guest:name']) out.push({ key: 'guest:name', anchor: 'guest-name', label: 'Your name', text: errors['guest:name'] });
    if (errors['guest:email']) out.push({ key: 'guest:email', anchor: 'guest-email', label: 'Your email', text: errors['guest:email'] });
    for (const f of questions) if (errors[f.id]) out.push({ key: f.id, anchor: `q-${f.id}`, label: f.label, text: errors[f.id] });
    extra.forEach((_, i) => {
      for (const f of repeated) {
        const k = `${MORE_KEY}.${i}.${f.id}`;
        if (errors[k]) out.push({ key: k, anchor: `q-${itemFieldId(f, i)}`, label: `${itemLabel} ${i + 2}: ${f.label}`, text: errors[k] });
      }
    });
    return out;
  }, [errors, questions, extra, repeated, itemLabel]);

  const fail = (message: string, errs: Record<string, string>) => {
    setErrors(errs);
    setSummary(message);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const send = async () => {
    if (!form || !id) return;
    const check = validateAnswers(fields, answers, undefined, itemsMax);
    if (guest) {
      if (guestName.trim().length < 2) check.errors['guest:name'] = 'Write your full name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guestEmail.trim())) check.errors['guest:email'] = 'Enter your email address, like name@example.com.';
    }
    const count = Object.keys(check.errors).length;
    if (count) { fail(`${count === 1 ? 'One answer needs' : `${count} answers need`} attention before sending.`, check.errors); return; }
    setSending(true);
    setSummary(null);
    const changed = answeredBefore;
    if (guest && mode?.kind === 'guest') {
      const res = await guestSubmit(id, { name: guestName.trim(), email: guestEmail.trim(), answers: check.answers, website, token });
      setSending(false);
      if ('error' in res) { fail(res.error, res.errors ?? {}); return; }
      // Keep the private link in the address, so a reload shows the answer.
      if (res.token) setSearch((p) => { const n = new URLSearchParams(p); n.set('r', res.token!); return n; }, { replace: true });
      setMode({ ...mode, response: res.response });
      setAnswers(res.response.answers);
      setEditing(false);
      setSent({ emailed: res.emailed, changed, to: res.response.email ?? guestEmail.trim() });
    } else if (mode?.kind === 'member' && session) {
      const res = await submitAnswers(session, id, check.answers);
      setSending(false);
      if ('error' in res) { fail(res.error, res.errors ?? {}); return; }
      noteAnswered(id);
      setMode({ kind: 'member', data: { ...mode.data, response: res.response } });
      setAnswers(res.response.answers);
      setEditing(false);
      setSent({ emailed: res.emailed, changed, to: mode.data.me.email });
    } else {
      setSending(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── States around the form ─────────────────────────────────────────
  if (isLoading || (!mode && !loadError)) {
    return <EventCardShell title="Form"><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" /></div></EventCardShell>;
  }
  if (mode?.kind === 'members-only') {
    return (
      <EventCardShell title={mode.title} description="A form for the members of Minerva Investment Management Society.">
        <div className="text-center font-body">
          <Lock className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden />
          <h1 className="font-serif text-2xl text-accent">Sign in to answer</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            This form is for the Society's members. Sign in with your Minerva account: you will find it on your Dashboard, under Forms for you.
          </p>
          {!user && <Button asChild variant="solid" className="mt-6"><Link to="/auth">Sign in</Link></Button>}
        </div>
      </EventCardShell>
    );
  }
  if (loadError || !form || !mode) {
    return (
      <EventCardShell title="Form">
        <div className="text-center font-body">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden />
          <h1 className="font-serif text-2xl text-accent">This form cannot be opened</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{loadError ?? 'It may have been removed.'}</p>
          {user
            ? <Button asChild variant="outline" className="mt-6"><Link to={WORKSPACE_BASE}>Go to the Workspace</Link></Button>
            // A member following an organiser's link to a draft is not signed in yet.
            : <Button asChild variant="outline" className="mt-6"><Link to="/auth">Members: sign in</Link></Button>}
        </div>
      </EventCardShell>
    );
  }

  const deadline = form.closes_at ? deadlineText(form.closes_at) : null;
  const coverUrl = form.cover_path ? images[form.cover_path] : undefined;
  const owed = response ? (response.amount_due ?? amountDue(form.track_payments, form.payment_amount, fields, response.answers)) : null;
  const itemsNow = 1 + extra.length;
  const showTotal = form.track_payments && liveTotal != null && (priced || itemsMax > 1);
  const intro = guestLook ? 'A form from Minerva Investment Management Society.' : 'A form for the members of Minerva Investment Management Society.';
  let n = 0;

  return (
    <EventCardShell title={form.title} description={intro}>
      <div className="font-body">
        {preview && (
          <p className="mb-5 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Preview. This form is a draft: nobody can see it yet, and sending is turned off.
            {form.audience === 'external' && ' Guests give their name and email at the top, and never see questions that ask for a file.'}
            {form.audience === 'both' && ' Members see it as below; guests (from the link) also give their name and email, and never see questions that ask for a file.'}
          </p>
        )}
        {coverUrl && (
          <button type="button" onClick={() => setZoomCover(true)} className="mb-6 block w-full overflow-hidden border border-separator bg-muted/30" aria-label="Open the cover picture full size">
            <img src={coverUrl} alt={form.title} className="max-h-80 w-full object-cover" />
          </button>
        )}
        <ImageZoom url={zoomCover && coverUrl ? coverUrl : null} alt={form.title} onClose={() => setZoomCover(false)} />
        <div className="mb-6 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Form</div>
          <h1 className="font-serif text-2xl text-accent text-balance sm:text-3xl">{form.title}</h1>
          {form.description && <p className="mx-auto mt-3 max-w-[500px] whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">{form.description}</p>}
        </div>

        <div className="mx-auto mb-6 max-w-[500px] space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2.5">
            <CalendarClock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {deadline ? <span>{open ? 'Answer by' : 'Closed on'} <span className="text-foreground">{deadline}</span>{open ? ` (${deadlineRelative(form.closes_at).toLowerCase()})` : ''}</span> : <span>No deadline</span>}
          </div>
          {form.track_payments && (
            <div className="flex items-start gap-2.5">
              <CreditCard aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {priced
                  ? <>You pay for what you order{form.payment_amount != null ? <>, plus <span className="text-foreground">{money(form.payment_amount)}</span>{itemsMax > 1 ? ` for each ${itemLabel.toLowerCase()}` : ''}</> : ''}: the total shows as you answer. </>
                  : form.payment_amount != null
                    ? <>{itemsMax > 1 ? <>Price: <span className="text-foreground">{money(form.payment_amount)}</span> for each {itemLabel.toLowerCase()}. </> : <>Payment due: <span className="text-foreground">{money(form.payment_amount)}</span>. </>}</>
                    : 'This form collects a payment. '}
                {form.payment_instructions}
              </span>
            </div>
          )}
          {!guestLook && mode.kind === 'member' && (
            <div className="flex items-start gap-2.5">
              <Mail aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Answering as <span className="text-foreground">{mode.data.me.name}</span> ({mode.data.me.email}). A receipt is emailed to you when you send.</span>
            </div>
          )}
          {guestLook && (
            <div className="flex items-start gap-2.5">
              <Mail aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>A receipt is emailed to the address you give, with a private link to see{form.allow_edits ? ' or change' : ''} your answers.</span>
            </div>
          )}
        </div>

        {/* Sent: say so first. */}
        {sent && (
          <div className="mb-6 border border-emerald-300 bg-emerald-50 px-4 py-4 text-emerald-950" role="status">
            <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5" aria-hidden />{sent.changed ? 'Your changes have been saved.' : 'Your answers have been sent.'}</p>
            {form.confirmation_message && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{form.confirmation_message}</p>}
            <p className="mt-2 text-sm">{sent.emailed ? `A receipt with your answers is on its way to ${sent.to}.` : 'Your answers are saved.'}</p>
            {guest && <p className="mt-1 text-sm">Keep the receipt: its link is the way back to your answers.</p>}
          </div>
        )}

        {!canAnswer && !preview && (
          <p className="mb-6 border border-separator bg-muted/30 px-4 py-3 text-sm">This form is for the Society's active members, so you can read it but not answer it.</p>
        )}

        {/* Answered, or closed: what they sent. */}
        {!showForm && response && (
          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-accent">Your answers</h2>
              {open && form.allow_edits && (
                <Button variant="outline" size="sm" onClick={() => { setEditing(true); setSent(null); }}><Pencil className="h-4 w-4" />Change my answers</Button>
              )}
            </div>
            {guest && (response as GuestResponse).name && (
              <p className="mb-2 text-sm text-muted-foreground">Sent by <span className="text-foreground">{(response as GuestResponse).name}</span> ({(response as GuestResponse).email})</p>
            )}
            <SentAnswers fields={fields} answers={response.answers} files={files} label={itemLabel} />
            {form.track_payments && owed != null && (
              <p className="mt-3 flex items-center justify-between gap-3 border border-separator px-3 py-2 text-[15px]">
                <span>Amount due{itemCountLabel(response.answers, itemLabel)}</span>
                <span className="font-medium tabular-nums">{eur(owed)}{response.paid ? <span className="ml-2 text-sm font-normal text-emerald-700">paid</span> : null}</span>
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              {!open ? 'This form is closed, so the answers can no longer be changed.'
                : form.allow_edits ? `You can change them${deadline ? ` until ${deadline}` : ' while the form is open'}.`
                  : 'This form does not accept changes after sending.'}
              {response.paid && ' Your payment has been recorded.'}
            </p>
          </div>
        )}

        {!showForm && !response && !open && !preview && (
          <div className="mb-6 text-center">
            <Lock className="mx-auto mb-2 h-6 w-6 text-accent" aria-hidden />
            <p className="font-serif text-xl text-accent">This form is closed</p>
            <p className="mt-1 text-sm text-muted-foreground">{deadline ? `It stopped taking answers on ${deadline}.` : 'It no longer takes answers.'} For anything urgent, write to <a className="text-accent underline" href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>.</p>
          </div>
        )}

        {showForm && (
          <form data-clarity-mask="True" noValidate onSubmit={(e) => { e.preventDefault(); if (canSend) send(); }}>
            {summary && (
              <div ref={summaryRef} tabIndex={-1} className="mb-5 border-2 border-destructive px-4 py-3 focus:outline-none" role="alert">
                <p className="flex items-center gap-2 font-medium text-destructive"><AlertCircle className="h-4 w-4" aria-hidden />{summary}</p>
                {errorList.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
                    {errorList.map((x) => (
                      <li key={x.key}><a href={`#${x.anchor}`} className="text-destructive underline underline-offset-2" onClick={(e) => { e.preventDefault(); const el = document.getElementById(x.anchor); el?.scrollIntoView({ block: 'center' }); (el as HTMLElement | null)?.focus?.(); }}>{x.label}</a>: {x.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {guestLook && (
              <fieldset className="mb-7 border border-separator p-4" disabled={sending || !canSend}>
                <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">About you</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-name" className="text-[15px]">Full name <span className="text-destructive">*</span></Label>
                    <Input id="guest-name" value={guestName} maxLength={120} autoComplete="name" className="h-11 text-base"
                      aria-invalid={!!errors['guest:name']} aria-describedby={errors['guest:name'] ? 'guest-name-err' : undefined}
                      onChange={(e) => { setGuestName(e.target.value); clearError('guest:name'); }} />
                    {errors['guest:name'] && <p id="guest-name-err" className="text-sm text-destructive">{errors['guest:name']}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-email" className="text-[15px]">Email <span className="text-destructive">*</span></Label>
                    <Input id="guest-email" type="email" value={guestEmail} maxLength={254} autoComplete="email" className="h-11 text-base"
                      readOnly={answeredBefore} aria-invalid={!!errors['guest:email']} aria-describedby={errors['guest:email'] ? 'guest-email-err' : 'guest-email-help'}
                      onChange={(e) => { setGuestEmail(e.target.value); clearError('guest:email'); }} />
                    {errors['guest:email']
                      ? <p id="guest-email-err" className="text-sm text-destructive">{errors['guest:email']}</p>
                      : <p id="guest-email-help" className="text-xs text-muted-foreground">{answeredBefore ? 'The address this answer was sent from.' : 'Your receipt goes here.'}</p>}
                  </div>
                </div>
                {/* People never see this; robots fill it in. */}
                <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
              </fieldset>
            )}

            {questions.some((f) => f.required) && <p className="mb-4 text-xs text-muted-foreground">Questions marked <span className="text-destructive">*</span> are required.</p>}
            <div className="space-y-7">
              {fields.filter((f) => shown.has(f.id)).map((f: FormField) => (
                <FieldInput
                  key={f.id}
                  field={f}
                  number={isQuestion(f) ? ++n : undefined}
                  value={first[f.id]}
                  onChange={(v) => setAnswer(f.id, v)}
                  error={errors[f.id]}
                  disabled={sending || !canSend}
                  fileUrls={files}
                  imageUrls={images}
                  onUpload={(field, file, onProgress) => uploadFormFile(session, form.id, field.id, file, onProgress)}
                />
              ))}
            </div>

            {/* More than one: the questions of one item again, for each extra one. */}
            {itemsMax > 1 && repeated.length > 0 && (
              <div className="mt-8 space-y-6">
                {extra.map((m, i) => {
                  const seen = visibleIds(fields, { ...first, ...m });
                  let k = 0;
                  return (
                    <section key={i} id={`item-${i + 2}`} aria-labelledby={`item-${i + 2}-title`} className="border-2 border-accent/30 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 id={`item-${i + 2}-title`} className="font-serif text-xl text-accent">{itemLabel} {i + 2}</h2>
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={sending || !canSend} onClick={() => removeItem(i)}>
                          <Trash2 className="h-4 w-4" />Remove
                        </Button>
                      </div>
                      <div className="space-y-7">
                        {repeated.filter((f) => seen.has(f.id)).map((f) => (
                          <FieldInput
                            key={itemFieldId(f, i)}
                            field={{ ...f, id: itemFieldId(f, i) }}
                            number={++k}
                            value={m[f.id]}
                            onChange={(v) => setItemAnswer(i, f.id, v)}
                            error={errors[`${MORE_KEY}.${i}.${f.id}`]}
                            disabled={sending || !canSend}
                            fileUrls={files}
                            imageUrls={images}
                            onUpload={(_field, file, onProgress) => uploadFormFile(session, form.id, f.id, file, onProgress)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
                {itemsNow < itemsMax ? (
                  <button type="button" onClick={addItem} disabled={sending || !canSend}
                    className="flex w-full flex-col items-center gap-1 border-2 border-dashed border-accent/40 px-4 py-5 text-center transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50">
                    <span className="flex items-center gap-2 font-serif text-lg text-accent"><Plus className="h-5 w-5" aria-hidden />Want another one?</span>
                    <span className="text-sm text-muted-foreground">Add {itemLabel.toLowerCase()} {itemsNow + 1}: the same questions again. Up to {itemsMax} in one answer.</span>
                  </button>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">That is {itemsMax}, the most one answer can hold.</p>
                )}
              </div>
            )}

            {showTotal && (
              <div className="mt-7 flex items-center justify-between gap-3 border-y-2 border-y-accent py-3" aria-live="polite">
                <span className="text-[15px] font-medium">Your total{itemsMax > 1 ? <span className="ml-1 font-normal text-muted-foreground">({countOf(itemsNow, itemLabel.toLowerCase())})</span> : null}</span>
                <span className="font-serif text-2xl tabular-nums text-accent">{eur(liveTotal!)}</span>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button type="submit" variant="solid" className="h-12 flex-1 text-[15px]" disabled={sending || !canSend}>
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending</> : answeredBefore ? 'Save my changes' : 'Send my answers'}
              </Button>
              {answeredBefore && editing && (
                <Button type="button" variant="outline" className="h-12" onClick={() => { setEditing(false); setAnswers(response!.answers); setErrors({}); setSummary(null); }}>Cancel</Button>
              )}
            </div>
          </form>
        )}

        {user && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to={WORKSPACE_BASE} className="underline underline-offset-2">Back to the Workspace</Link>
          </p>
        )}
      </div>
    </EventCardShell>
  );
}

/** ", for 3 hoodies" when an answer holds several items. */
function itemCountLabel(answers: Answers, label: string): string {
  const n = 1 + moreItems(answers).length;
  return n > 1 ? `, for ${countOf(n, label.toLowerCase())}` : '';
}
