import { useEffect, useState } from 'react';
import { isOnlineEvent } from '@/lib/event-place';
import { useHideSiteFooter } from '@/components/layout/ChromeContext';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarDays, MapPin, Users, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { registerForEvent, isAssociationMember, eventPlaces, EVENT_TYPE_LABELS, type EventRow, type EventPlaces } from '@/lib/events-api';
import { formatEventWhen } from '@/lib/event-time';
import { AddToCalendar } from '@/components/shared/AddToCalendar';
import { BOCCONI_PROGRAMMES } from '@/lib/bocconi';
import { ACADEMIC_YEAR_LABELS, type AcademicYear } from '@/lib/applications-api';
import { EventCardShell } from '@/components/events/EventCardShell';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

// The navy stage, the beams field and the white card: see
// src/components/events/EventCardShell.tsx.
const Shell = EventCardShell;

export default function EventRegister() {
  // This page is the backdrop-plus-one-card shape, hand-rolled rather
  // than through AuthLayout, so it declares the same thing directly.
  useHideSiteFooter();
  const { id } = useParams<{ id: string }>();
  const { user, session, profile, roles, rolesLoaded } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { kind: 'registered' | 'waitlist'; position?: number | null; already?: boolean }>(null);
  // Places left, for an event with a limit; null when there is no limit.
  const [places, setPlaces] = useState<EventPlaces | null>(null);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [isBocconi, setIsBocconi] = useState(true);
  const [programme, setProgramme] = useState('');
  const [academicYear, setAcademicYear] = useState<AcademicYear | ''>('');
  const [affiliation, setAffiliation] = useState('');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb.from('events').select('*').eq('id', id).maybeSingle();
        setEvent((data as EventRow) ?? null);
        if (data && id) setPlaces(await eventPlaces(id));
      } finally { setLoading(false); }
    })();
  }, [id]);

  // ═══════════════════════════════════════════════════════════════════
  // WHO IS FILLING THIS IN, AND WHAT THE ASSOCIATION ALREADY KNOWS.
  // -------------------------------------------------------------------
  // Two different questions, and this page used to ask only the first.
  // `user` answers "is somebody signed in"; it does NOT answer "does the
  // association hold this person's name, programme and year", because an
  // applicant has an account too. `isAssociationMember` is the rule the
  // endpoint itself uses, so the form and the endpoint now agree about
  // who is who. See lib/events-api.ts.
  //
  // A MEMBER'S PATH IS UNTOUCHED: they still see one line and one
  // button, and still send nothing but the event. Everyone else fills
  // the form in, signed in or not, which is what an applicant needed and
  // never had.
  // ═══════════════════════════════════════════════════════════════════
  const memberRegistering = !!user && isAssociationMember(roles);
  const needsDetails = !memberRegistering;
  // Roles arrive a moment after the session does. Deciding before they
  // land would show a member the manual form and then swap it under them.
  const checkingMembership = !!user && !rolesLoaded;

  // What the account already gives us goes in, so a signed-in applicant
  // confirms their details rather than typing them out. Every field stays
  // editable: this is a starting point, not an assertion.
  useEffect(() => {
    if (!user) return;
    setEmail((e) => e || user.email || '');
    const full = (profile?.full_name || '').trim();
    if (!full) return;
    const parts = full.split(/\s+/);
    setFirstName((v) => v || parts[0] || '');
    setSurname((v) => v || parts.slice(1).join(' '));
  }, [user, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!consent) { toast({ title: 'Please accept the privacy policy to continue.', variant: 'destructive' }); return; }
    if (needsDetails) {
      if (!firstName.trim() || !surname.trim() || !email.trim()) { toast({ title: 'Please add your name, surname and email.', variant: 'destructive' }); return; }
      if (isBocconi && (!programme || !academicYear)) { toast({ title: 'Please select your Bocconi programme and year.', variant: 'destructive' }); return; }
      if (!isBocconi && !affiliation.trim()) { toast({ title: 'Please add your university or company.', variant: 'destructive' }); return; }
    }
    setSubmitting(true);
    try {
      const res = await registerForEvent(session, {
        event_id: id,
        name: needsDetails ? `${firstName.trim()} ${surname.trim()}`.trim() : undefined,
        email: needsDetails ? email.trim() : undefined,
        is_bocconi: needsDetails ? isBocconi : undefined,
        programme: needsDetails && isBocconi ? programme : undefined,
        academic_year: needsDetails && isBocconi ? (academicYear || undefined) : undefined,
        affiliation: needsDetails && !isBocconi ? affiliation.trim() : undefined,
      });
      const r = res as { alreadyRegistered?: boolean; waitlisted?: boolean; alreadyWaiting?: boolean; position?: number | null };
      setDone(r.waitlisted ? { kind: 'waitlist', position: r.position ?? null, already: !!r.alreadyWaiting } : { kind: 'registered', already: !!r.alreadyRegistered });
    } catch (err) { toast({ title: 'Could not register', description: err instanceof Error ? err.message : undefined, variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Shell><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Shell>;
  if (!event) return <Shell><h1 className="font-serif text-2xl text-accent mb-3 text-center">Event not found</h1><div className="text-center"><Link to="/events" className="text-accent underline font-body">Back to events</Link></div></Shell>;

  if (!event.registration_enabled) {
    return <Shell><h1 className="font-serif text-2xl text-accent mb-3 text-center">{event.title}</h1>
      <p className="font-body text-muted-foreground text-center">Registration is not open for this event.</p></Shell>;
  }

  if (done?.kind === 'waitlist') {
    return <Shell><h1 className="font-serif text-2xl text-accent mb-3 text-center">You are on the waiting list</h1>
      <p className="font-body text-muted-foreground text-center max-w-[460px] mx-auto">
        {done.already ? 'You were already on the waiting list for ' : `${event.title} is full at the moment, so you have been added to the waiting list for `}
        <span className="text-foreground">{event.title}</span>{done.position ? `: you are number ${done.position}` : ''}. If a place opens up, it goes to the first person on the list, and we will email you at once to confirm it, with your entry code.
      </p>
      <div className="text-center"><Link to="/events" className="inline-block mt-6 text-accent underline font-body">Back to events</Link></div></Shell>;
  }

  if (done) {
    return <Shell><h1 className="font-serif text-2xl text-accent mb-3 text-center">{done.already ? 'You are already registered' : 'You are registered'}</h1>
      <p className="font-body text-muted-foreground text-center max-w-[460px] mx-auto">
        Thank you for registering for <span className="text-foreground">{event.title}</span>. {done.already ? 'Your confirmation email has your entry code.' : 'A confirmation with your entry code is on its way to your inbox.'}
      </p>
      <div className="flex flex-col items-center gap-3 mt-6">
        <AddToCalendar eventId={event.id} size="default" />
        <Link to="/events" className="text-accent underline font-body">Back to events</Link>
      </div></Shell>;
  }

  const membersOnly = event.registration_audience === 'members';
  const when = formatEventWhen(event);
  const left = places ? Math.max(0, places.capacity - places.taken) : null;
  const full = left === 0;

  return (
    <Shell>
      {/* Event details per the Minerva Forms design: eyebrow, serif title,
          icon meta rows, description. */}
      <div className="text-center mb-5">
        <div className="font-body text-xs uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-2">{EVENT_TYPE_LABELS[event.event_type]}</div>
        <h1 className="font-serif text-2xl sm:text-3xl text-accent text-balance">{event.title}</h1>
      </div>
      <div className="font-body text-sm text-muted-foreground space-y-2 mb-5 max-w-[470px] mx-auto">
        <div className="flex items-start gap-2.5"><CalendarDays className="h-4 w-4 shrink-0 mt-0.5" />{when}</div>
        {event.place && <div className="flex items-start gap-2.5"><MapPin className="h-4 w-4 shrink-0 mt-0.5" />{isOnlineEvent(event) ? 'Online: the link to join is in your confirmation email' : event.place}</div>}
        {event.guest && event.guest.length > 0 && <div className="flex items-start gap-2.5"><Users className="h-4 w-4 shrink-0 mt-0.5" />{event.guest.join(', ')}</div>}
        {left !== null && (
          <div className="flex items-start gap-2.5"><Ticket className="h-4 w-4 shrink-0 mt-0.5" />
            {full ? <span>Full. You can join the waiting list below.</span> : <span>{left === 1 ? '1 place left' : `${left} places left`}</span>}
          </div>
        )}
      </div>
      {/* THE DESCRIPTION READS LEFT, not centred. Centring is right for a
          title and for the two or three words of a status line; a paragraph
          of a hundred and fifty words set centred gives every line a
          different starting point, so the eye has to hunt for the next one.
          The block stays centred in the card; only its text is aligned. */}
      {event.description && <p className="font-body text-sm text-foreground leading-relaxed mb-2 max-w-[470px] mx-auto text-left">{event.description}</p>}

      <div className="max-w-[520px] mx-auto mt-7">
        <div className="pb-2 border-b border-[#D9D9D9] mb-5">
          <span className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground">Registration</span>
        </div>

      {checkingMembership ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : membersOnly && !memberRegistering ? (
        <div className="font-body text-center">
          {/* SIGNED IN AND NOT A MEMBER IS ITS OWN ANSWER. Telling an
              applicant who is already signed in to "please sign in" was
              an instruction they could not follow, and the form used to
              be shown to them instead, only for the endpoint to refuse
              it afterwards. */}
          {user ? (
            <>
              <p className="text-muted-foreground mb-4">
                This event is open to association members. Your account is not a member yet, so registration for
                this one is not available.
              </p>
              <Button asChild variant="outline"><Link to="/events">See the events open to everyone</Link></Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">This event is for association members. Please sign in to register.</p>
              <Button asChild><Link to="/auth" state={{ from: `/events/${id}/register` }}>Sign in</Link></Button>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 font-body">
          {memberRegistering ? (
            <p className="text-sm text-muted-foreground text-center">Registering as <span className="text-foreground">{user.email}</span>. Your details are filled in automatically.</p>
          ) : (
            <>
              {user && (
                <p className="text-sm text-muted-foreground text-center">
                  Signed in as <span className="text-foreground">{user.email}</span>. We do not hold your details yet,
                  so please confirm them below.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Name *</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Marco" required /></div>
                <div className="space-y-1"><Label>Surname *</Label><Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="e.g. Rossi" required /></div>
              </div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. marco.rossi@email.com" required /></div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="bocconi" checked={isBocconi} onCheckedChange={(v) => setIsBocconi(v === true)} />
                <Label htmlFor="bocconi" className="font-normal">I am a Bocconi student</Label>
              </div>

              {isBocconi ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Programme *</Label>
                    <Select value={programme} onValueChange={setProgramme}>
                      <SelectTrigger><SelectValue placeholder="Select your programme" /></SelectTrigger>
                      <SelectContent>
                        {BOCCONI_PROGRAMMES.map((g) => (
                          <SelectGroup key={g.label}>
                            <SelectLabel>{g.label}</SelectLabel>
                            {g.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Year *</Label>
                    <Select value={academicYear} onValueChange={(v) => setAcademicYear(v as AcademicYear)}>
                      <SelectTrigger><SelectValue placeholder="Select your year" /></SelectTrigger>
                      <SelectContent>{(Object.keys(ACADEMIC_YEAR_LABELS) as AcademicYear[]).map((y) => <SelectItem key={y} value={y}>{ACADEMIC_YEAR_LABELS[y]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1"><Label>University or company *</Label><Input value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder="e.g. Politecnico di Milano" required /></div>
              )}
            </>
          )}

          <div className="flex items-start gap-2 pt-1">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" />
            <Label htmlFor="consent" className="font-normal text-sm text-muted-foreground">
              I have read and accept the privacy policy and consent to the processing of my personal data for the purpose of this event.
            </Label>
          </div>

          {/* Serif register button per the design: navy that inverts on
              hover. The animated specular border it used to carry is gone:
              its rounded-rectangle outline did not match the button's square
              corners and showed as a wedge outside each one. */}
          <button
            type="submit"
            disabled={submitting}
            className="relative w-full mt-1 py-3.5 font-serif text-lg border border-accent bg-accent text-accent-foreground hover:bg-white hover:text-accent transition-colors duration-200 disabled:opacity-70"
          >
            <span className="relative z-[2]">
              {submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{full ? 'Joining' : 'Registering'}</span> : full ? 'Join the waiting list' : 'Register'}
            </span>
          </button>
        </form>
      )}
      </div>
    </Shell>
  );
}
