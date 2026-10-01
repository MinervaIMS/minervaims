// =====================================================================
// /forms/:id: a member answers one of the Society's internal forms.
// ---------------------------------------------------------------------
// The same navy stage and white card as event registration, so the
// Society's forms look like one family. One column, the label above each
// field, the requirement said in words, every error under its question
// and summarised at the top with links when sending fails. After sending,
// the member is told plainly that it worked, that a receipt is on its way
// and, where the form allows it, how long they can still change their
// answers. A closed form says when it closed and shows what they sent.
//
// Signed out: the page asks them to sign in. Sign-in lands on the
// Dashboard, where the same form waits for them in "Forms for you".
// =====================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CalendarClock, CheckCircle2, CreditCard, Loader2, Lock, Mail, Pencil } from 'lucide-react';
import { useHideSiteFooter } from '@/components/layout/ChromeContext';
import { EventCardShell } from '@/components/events/EventCardShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { FieldInput } from '@/components/forms/FieldInput';
import {
  answerText, isQuestion, validateAnswers, type AnswerValue, type Answers, type FormField,
} from '@/lib/internal-forms-rules';
import { fillGet, submitAnswers, uploadFormFile, type MemberForm } from '@/lib/internal-forms-api';
import { deadlineRelative, deadlineText, money } from '@/components/admin/forms/forms-model';
import { WORKSPACE_BASE } from '@/lib/workspace-base';

type Loaded = Awaited<ReturnType<typeof fillGet>>;

export default function InternalFormPage() {
  useHideSiteFooter();
  const { id } = useParams<{ id: string }>();
  const { user, session, isLoading } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | { emailed: boolean; changed: boolean }>(null);
  const [editing, setEditing] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id || !session) return;
    try {
      const d = await fillGet(session, id);
      setData(d);
      setAnswers((d.response?.answers ?? {}) as Answers);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'This form could not be opened.');
    }
  }, [id, session]);

  useEffect(() => { if (session) load(); }, [session, load]);

  const form: MemberForm | null = data?.form ?? null;
  const questions = useMemo(() => (form?.fields ?? []).filter(isQuestion), [form]);
  const answeredBefore = !!data?.response;
  const open = form?.state === 'open';
  const preview = form?.state === 'draft';
  const canSend = !!data?.me.can_answer && open && (!answeredBefore || form?.allow_edits || false);
  // The questions show while there is something to do with them: a first
  // answer, a change being made, or an organiser's preview.
  const showForm = !!form && (preview || (open && (!answeredBefore || editing)));

  const setAnswer = (fieldId: string, v: AnswerValue | undefined) => {
    setAnswers((a) => {
      const next = { ...a };
      if (v === undefined) delete next[fieldId]; else next[fieldId] = v;
      return next;
    });
    if (errors[fieldId]) setErrors((e) => { const n = { ...e }; delete n[fieldId]; return n; });
  };

  const send = async () => {
    if (!form || !session || !id) return;
    const check = validateAnswers(form.fields, answers);
    if (Object.keys(check.errors).length) {
      setErrors(check.errors);
      setSummary(`${Object.keys(check.errors).length === 1 ? 'One answer needs' : `${Object.keys(check.errors).length} answers need`} attention before sending.`);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSending(true);
    setSummary(null);
    const res = await submitAnswers(session, id, check.answers);
    setSending(false);
    if ('error' in res) {
      if (res.errors && Object.keys(res.errors).length) setErrors(res.errors);
      setSummary(res.error);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const changed = answeredBefore;
    setData((d) => (d ? { ...d, response: res.response } : d));
    setAnswers(res.response.answers);
    setEditing(false);
    setSent({ emailed: res.emailed, changed });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── States around the form ─────────────────────────────────────────
  if (isLoading || (user && !data && !loadError)) {
    return <EventCardShell title="Internal form"><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" /></div></EventCardShell>;
  }
  if (!user) {
    return (
      <EventCardShell title="Internal form" description="A form for the members of Minerva Investment Management Society.">
        <div className="text-center font-body">
          <Lock className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden />
          <h1 className="font-serif text-2xl text-accent">Sign in to answer</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            This form is for the Society's members. Sign in with your Minerva account: you will find it on your Dashboard, under Forms for you.
          </p>
          <Button asChild variant="solid" className="mt-6"><Link to="/auth">Sign in</Link></Button>
        </div>
      </EventCardShell>
    );
  }
  if (loadError || !form || !data) {
    return (
      <EventCardShell title="Internal form">
        <div className="text-center font-body">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden />
          <h1 className="font-serif text-2xl text-accent">This form cannot be opened</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{loadError ?? 'It may have been removed.'}</p>
          <Button asChild variant="outline" className="mt-6"><Link to={WORKSPACE_BASE}>Go to the Workspace</Link></Button>
        </div>
      </EventCardShell>
    );
  }

  const deadline = form.closes_at ? deadlineText(form.closes_at) : null;
  let n = 0;

  return (
    <EventCardShell title={form.title} description="A form for the members of Minerva Investment Management Society.">
      <div className="font-body">
        {preview && (
          <p className="mb-5 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Preview. This form is a draft: members cannot see it yet, and sending is turned off.
          </p>
        )}
        <div className="mb-6 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Internal form</div>
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
              <span>{form.payment_amount != null ? <>Payment due: <span className="text-foreground">{money(form.payment_amount)}</span>. </> : 'This form collects a payment. '}{form.payment_instructions}</span>
            </div>
          )}
          <div className="flex items-start gap-2.5">
            <Mail aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Answering as <span className="text-foreground">{data.me.name}</span> ({data.me.email}). A receipt is emailed to you when you send.</span>
          </div>
        </div>

        {/* Sent: say so first. */}
        {sent && (
          <div className="mb-6 border border-emerald-300 bg-emerald-50 px-4 py-4 text-emerald-950" role="status">
            <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5" aria-hidden />{sent.changed ? 'Your changes have been saved.' : 'Your answers have been sent.'}</p>
            {form.confirmation_message && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{form.confirmation_message}</p>}
            <p className="mt-2 text-sm">{sent.emailed ? `A receipt with your answers is on its way to ${data.me.email}.` : 'Your answers are saved.'}</p>
          </div>
        )}

        {!data.me.can_answer && !preview && (
          <p className="mb-6 border border-separator bg-muted/30 px-4 py-3 text-sm">Internal forms are for the Society's active members, so you can read this form but not answer it.</p>
        )}

        {/* Answered, or closed: what they sent. */}
        {!showForm && data.response && (
          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-accent">Your answers</h2>
              {open && form.allow_edits && (
                <Button variant="outline" size="sm" onClick={() => { setEditing(true); setSent(null); }}><Pencil className="h-4 w-4" />Change my answers</Button>
              )}
            </div>
            <dl className="divide-y divide-separator border-y-2 border-y-accent">
              {questions.map((f) => {
                const v = data.response!.answers[f.id];
                return (
                  <div key={f.id} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                    <dd className="whitespace-pre-wrap break-words text-[15px]">
                      {f.type === 'file' && Array.isArray(v)
                        ? (v as { path: string; name: string }[]).map((x) => (data.files[x.path] ? <a key={x.path} href={data.files[x.path]} target="_blank" rel="noopener noreferrer" className="mr-3 text-accent underline underline-offset-2">{x.name}</a> : <span key={x.path} className="mr-3">{x.name}</span>))
                        : answerText(f, v) || <span className="text-muted-foreground">No answer</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">
              {!open ? 'This form is closed, so the answers can no longer be changed.'
                : form.allow_edits ? `You can change them${deadline ? ` until ${deadline}` : ' while the form is open'}.`
                  : 'This form does not accept changes after sending.'}
              {data.response.paid && ' Your payment has been recorded.'}
            </p>
          </div>
        )}

        {!showForm && !data.response && !open && !preview && (
          <div className="mb-6 text-center">
            <Lock className="mx-auto mb-2 h-6 w-6 text-accent" aria-hidden />
            <p className="font-serif text-xl text-accent">This form is closed</p>
            <p className="mt-1 text-sm text-muted-foreground">{deadline ? `It stopped taking answers on ${deadline}.` : 'It no longer takes answers.'} For anything urgent, write to <a className="text-accent underline" href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>.</p>
          </div>
        )}

        {showForm && (
          <form noValidate onSubmit={(e) => { e.preventDefault(); if (canSend) send(); }}>
            {summary && (
              <div ref={summaryRef} tabIndex={-1} className="mb-5 border-2 border-destructive px-4 py-3 focus:outline-none" role="alert">
                <p className="flex items-center gap-2 font-medium text-destructive"><AlertCircle className="h-4 w-4" aria-hidden />{summary}</p>
                {Object.keys(errors).length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
                    {questions.filter((f) => errors[f.id]).map((f) => (
                      <li key={f.id}><a href={`#q-${f.id}`} className="text-destructive underline underline-offset-2" onClick={(e) => { e.preventDefault(); document.getElementById(`q-${f.id}`)?.scrollIntoView({ block: 'center' }); (document.getElementById(`q-${f.id}`) as HTMLElement | null)?.focus?.(); }}>{f.label}</a>: {errors[f.id]}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {questions.some((f) => f.required) && <p className="mb-4 text-xs text-muted-foreground">Questions marked <span className="text-destructive">*</span> are required.</p>}
            <div className="space-y-7">
              {form.fields.map((f: FormField) => (
                <FieldInput
                  key={f.id}
                  field={f}
                  number={isQuestion(f) ? ++n : undefined}
                  value={answers[f.id]}
                  onChange={(v) => setAnswer(f.id, v)}
                  error={errors[f.id]}
                  disabled={sending || !canSend}
                  fileUrls={data.files}
                  onUpload={(field, file, onProgress) => uploadFormFile(session, form.id, field.id, file, onProgress)}
                />
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button type="submit" variant="solid" className="h-12 flex-1 text-[15px]" disabled={sending || !canSend}>
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending</> : answeredBefore ? 'Save my changes' : 'Send my answers'}
              </Button>
              {answeredBefore && editing && (
                <Button type="button" variant="outline" className="h-12" onClick={() => { setEditing(false); setAnswers(data.response!.answers); setErrors({}); setSummary(null); }}>Cancel</Button>
              )}
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to={WORKSPACE_BASE} className="underline underline-offset-2">Back to the Workspace</Link>
        </p>
      </div>
    </EventCardShell>
  );
}
