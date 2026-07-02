import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarDays, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { registerForEvent, EVENT_TYPE_LABELS, type EventRow } from '@/lib/events-api';
import { BOCCONI_PROGRAMMES } from '@/lib/bocconi';
import { ACADEMIC_YEAR_LABELS, type AcademicYear } from '@/lib/applications-api';
import logoMark from '@/assets/logo-color.svg';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export default function EventRegister() {
  const { id } = useParams<{ id: string }>();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
      } finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => { if (user?.email) setEmail((e) => e || user.email || ''); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!consent) { toast({ title: 'Please accept the privacy policy to continue.', variant: 'destructive' }); return; }
    if (!user) {
      if (!firstName.trim() || !surname.trim() || !email.trim()) { toast({ title: 'Please add your name, surname and email.', variant: 'destructive' }); return; }
      if (isBocconi && (!programme || !academicYear)) { toast({ title: 'Please select your Bocconi programme and year.', variant: 'destructive' }); return; }
      if (!isBocconi && !affiliation.trim()) { toast({ title: 'Please add your university or company.', variant: 'destructive' }); return; }
    }
    setSubmitting(true);
    try {
      const res = await registerForEvent(session, {
        event_id: id,
        name: user ? undefined : `${firstName.trim()} ${surname.trim()}`.trim(),
        email: user ? undefined : email.trim(),
        is_bocconi: user ? undefined : isBocconi,
        programme: user || !isBocconi ? undefined : programme,
        academic_year: user || !isBocconi ? undefined : academicYear || undefined,
        affiliation: user || isBocconi ? undefined : affiliation.trim(),
      });
      setDone(true);
      toast({ title: (res as { alreadyRegistered?: boolean }).alreadyRegistered ? 'You are already registered' : 'Registration confirmed' });
    } catch (err) { toast({ title: 'Could not register', description: err instanceof Error ? err.message : undefined, variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <>
      <Helmet><title>Register | MIMS</title></Helmet>
      <div className="min-h-screen w-full bg-black flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-separator px-6 sm:px-10 py-10">
          <div className="flex justify-center mb-6"><img src={logoMark} alt="Minerva Investment Management Society" className="h-20 w-20" /></div>
          {children}
        </div>
      </div>
    </>
  );

  if (loading) return <Shell><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Shell>;
  if (!event) return <Shell><h1 className="font-serif text-2xl text-accent mb-3 text-center">Event not found</h1><div className="text-center"><Link to="/events" className="text-accent underline font-body">Back to events</Link></div></Shell>;

  if (!event.registration_enabled) {
    return <Shell><h1 className="font-serif text-2xl text-accent mb-3 text-center">{event.title}</h1>
      <p className="font-body text-muted-foreground text-center">Registration is not open for this event.</p></Shell>;
  }

  if (done) {
    return <Shell><h1 className="font-serif text-2xl text-accent mb-3 text-center">You are registered</h1>
      <p className="font-body text-muted-foreground text-center">Thank you for registering for {event.title}.</p>
      <div className="text-center"><Link to="/events" className="inline-block mt-6 text-accent underline font-body">Back to events</Link></div></Shell>;
  }

  const membersOnly = event.registration_audience === 'members';
  const when = new Date(event.start_at || event.date).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <Shell>
      {/* Event details */}
      <div className="text-center mb-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{EVENT_TYPE_LABELS[event.event_type]}</div>
        <h1 className="font-serif text-2xl sm:text-3xl text-accent">{event.title}</h1>
      </div>
      <div className="font-body text-sm text-muted-foreground space-y-1 mb-6 max-w-md mx-auto">
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" />{when}</div>
        {event.place && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" />{event.place}</div>}
        {event.guest && event.guest.length > 0 && <div className="flex items-start gap-2"><Users className="h-4 w-4 shrink-0 mt-0.5" />{event.guest.join(', ')}</div>}
      </div>
      {event.description && <p className="font-body text-sm text-foreground mb-6 max-w-md mx-auto text-center">{event.description}</p>}

      {membersOnly && !user ? (
        <div className="font-body text-center">
          <p className="text-muted-foreground mb-4">This event is for association members. Please sign in to register.</p>
          <Button asChild><Link to="/auth" state={{ from: `/events/${id}/register` }}>Sign in</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 font-body max-w-md mx-auto">
          {user ? (
            <p className="text-sm text-muted-foreground text-center">Registering as {user.email}. Your details are filled in automatically.</p>
          ) : (
            <>
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

          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering</> : 'Register'}</Button>
        </form>
      )}
    </Shell>
  );
}
