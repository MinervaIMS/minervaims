import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { Loader2, FileText, CheckCircle2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AddToCalendar } from '@/components/shared/AddToCalendar';
import { formatStamp } from '@/lib/event-time';
import {
  myInterests, submitInterest, formatClosing, interestOpen,
  SELECTION_STATEMENT, CV_USE_STATEMENT, FORFEIT_STATEMENT, VISIT_CONTACT, CV_MAX_BYTES,
  type MyInterest,
} from '@/lib/company-visits-api';

// =====================================================================
// The interest form of a company visit that selects its participants
// (Step 93B), in place of the registration form. Members and alumni,
// signed in, give their CV until the form closes. The page says, before
// anything is asked, how the participants are chosen (not by the CV) and
// what happens to the CV; afterwards it shows where the person stands,
// in the words of the emails they receive.
// =====================================================================

interface VisitEvent {
  id: string;
  title: string;
  registration_enabled: boolean;
  interest_closes_at?: string | null;
  capacity?: number | null;
}

export function CompanyVisitInterest({ event, user, session }: { event: VisitEvent; user: User | null; session: Session | null }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(!!user);
  const [eligible, setEligible] = useState(false);
  const [mine, setMine] = useState<MyInterest | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [sending, setSending] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const open = interestOpen(event);
  const closes = formatClosing(event.interest_closes_at);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await myInterests(session, event.id);
      setEligible(r.eligible);
      setMine(r.interests[0] ?? null);
    } catch {
      setEligible(false);
    } finally {
      setLoading(false);
    }
  }, [user, session, event.id]);
  useEffect(() => { load(); }, [load]);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > CV_MAX_BYTES) { toast({ title: 'The CV must be under 10 MB', variant: 'destructive' }); return; }
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { toast({ title: 'The CV must be a PDF file', variant: 'destructive' }); return; }
    setFile(f);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast({ title: 'Attach your CV (PDF)', variant: 'destructive' }); return; }
    if (!understood) { toast({ title: 'Please confirm you have read how participants are selected', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const r = await submitInterest(session, event.id, file);
      setMine(r.interest);
      setFile(null);
      setReplacing(false);
      toast(r.replaced ? { title: 'Your CV has been replaced' } : { title: 'Your interest has been received', description: 'A confirmation is on its way to your inbox.' });
    } catch (err) {
      toast({ title: 'Could not register your interest', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
      load();
    } finally {
      setSending(false);
    }
  };

  const Statement = () => (
    <div className="border border-accent/30 bg-accent/[0.04] px-4 py-3 text-sm text-foreground leading-relaxed space-y-2">
      <p className="font-semibold text-accent">How participants are selected</p>
      <p>{SELECTION_STATEMENT}</p>
      <p className="text-muted-foreground">{CV_USE_STATEMENT}</p>
    </div>
  );

  const heading = (
    <div className="pb-2 border-b border-[#D9D9D9] mb-5">
      <span className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground">Register your interest</span>
    </div>
  );

  if (!user) {
    return (
      <div className="font-body">
        {heading}
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Places at company visits are limited, so members and alumni register their interest and the President and the
            Vice President select the participants{closes ? `. The form closes on ${closes}` : ''}.
          </p>
          <Statement />
          <Button asChild><Link to="/auth" state={{ from: `/events/${event.id}/register` }}>Sign in to register your interest</Link></Button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="font-body">{heading}<div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></div>;

  // Where the person stands, once their interest is recorded.
  if (mine && !replacing) {
    const status = mine.status;
    return (
      <div className="font-body space-y-4">
        {heading}
        {status === 'received' && (
          <>
            <p className="flex items-start gap-2 text-foreground"><CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" /><span><span className="font-semibold">Your interest has been received.</span> We will email you the decision; everyone who registered their interest hears at the same time, after the form closes{closes ? ` on ${closes}` : ''}.</span></p>
            <p className="text-sm text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4 shrink-0" />{mine.cv_name || 'CV'} · sent {formatStamp(mine.submitted_at)}</p>
            <Statement />
            {open && <Button type="button" variant="outline" onClick={() => setReplacing(true)}>Replace my CV</Button>}
          </>
        )}
        {status === 'invited' && (
          <>
            <p className="flex items-start gap-2 text-foreground"><CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" /><span><span className="font-semibold">{mine.spot_opened ? 'A place opened up, and it is yours.' : 'You are invited.'}</span> Your invitation, with your entry code, is in your inbox.</span></p>
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-relaxed">
              <p className="font-semibold text-foreground">A commitment to the other members</p>
              <p className="text-foreground">{FORFEIT_STATEMENT} If you can no longer come, write to <a className="text-accent underline" href={`mailto:${VISIT_CONTACT}`}>{VISIT_CONTACT}</a> as soon as possible, so that your place can go to another member.</p>
            </div>
            <div className="flex justify-center"><AddToCalendar eventId={event.id} size="default" /></div>
          </>
        )}
        {status === 'not_selected' && (
          <>
            <p className="text-foreground"><span className="font-semibold">Not this time.</span> Thank you for your interest: there were more requests than places. You are on the reserve list, and if a place opens up we will email you at once.</p>
            <p className="text-sm text-muted-foreground">Taking part in the Society&rsquo;s activities through the year is what the selection looks at, and it will count for the next visit.</p>
          </>
        )}
        {status === 'withdrawn' && (
          <p className="text-foreground">You told the organisers you can no longer attend, and your place has gone to another member. Thank you for letting us know in time.</p>
        )}
        <div className="text-center"><Link to="/events" className="text-accent underline">Back to events</Link></div>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="font-body text-center space-y-4">
        {heading}
        <p className="text-muted-foreground">Company visits are open to members and alumni of the Society. Your account is not one yet, so you cannot register your interest in this visit.</p>
        <Button asChild variant="outline"><Link to="/events">See the events open to everyone</Link></Button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="font-body text-center space-y-3">
        {heading}
        <p className="text-muted-foreground">The interest form for this visit {closes ? `closed on ${closes}` : 'is closed'}, and the participants are being selected.</p>
        <Link to="/events" className="text-accent underline">Back to events</Link>
      </div>
    );
  }

  return (
    <form data-clarity-mask="True" onSubmit={send} className="font-body space-y-4">
      {heading}
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="text-foreground">{user.email}</span>. {event.capacity ? `There are ${event.capacity} places. ` : ''}
        The form closes on <span className="text-foreground">{closes}</span>; after that, everyone who registered their interest is told the decision at the same time.
      </p>
      <Statement />

      <div className="space-y-2">
        <Label>Your CV (PDF, up to 10 MB) *</Label>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
          className="border border-dashed border-[#BDBDBD] hover:border-accent px-4 py-5 text-center cursor-pointer transition-colors"
        >
          {file ? (
            <span className="inline-flex items-center gap-2 text-sm text-foreground"><FileText className="h-4 w-4" />{file.name} <span className="text-muted-foreground">({Math.max(1, Math.round(file.size / 1024))} KB) · change</span></span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Upload className="h-4 w-4" />Choose a PDF, or drop it here</span>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 pt-1">
        <Checkbox id="cv-understood" checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} className="mt-1" />
        <Label htmlFor="cv-understood" className="font-normal text-sm text-muted-foreground">
          I understand that my CV does not count towards the selection, that it may be shared with the host company only if I am
          invited and the host asks for it, and that it is deleted six months after the visit (<Link to="/privacy-policy" className="text-accent underline" target="_blank">Privacy Policy</Link>).
        </Label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          disabled={sending}
          className="relative flex-1 py-3.5 font-serif text-lg border border-accent bg-accent text-accent-foreground hover:bg-white hover:text-accent transition-colors duration-200 disabled:opacity-70"
        >
          {sending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Sending</span> : replacing ? 'Replace my CV' : 'Register my interest'}
        </button>
        {replacing && <Button type="button" variant="outline" className="h-auto" onClick={() => { setReplacing(false); setFile(null); }}>Keep the current CV</Button>}
      </div>
    </form>
  );
}
