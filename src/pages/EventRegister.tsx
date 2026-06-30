import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { registerForEvent, AUDIENCE_LABELS, type EventRow } from '@/lib/events-api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export default function EventRegister() {
  const { id } = useParams<{ id: string }>();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
    setSubmitting(true);
    try {
      const res = await registerForEvent(session, { event_id: id, name: name || undefined, email: email || undefined });
      setDone(true);
      toast({ title: (res as { alreadyRegistered?: boolean }).alreadyRegistered ? 'You are already registered' : 'Registration confirmed' });
    } catch (err) { toast({ title: 'Could not register', description: err instanceof Error ? err.message : undefined, variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <><Helmet><title>Register | MIMS</title></Helmet>
      <div className="max-w-lg mx-auto px-6 py-16">{children}</div></>
  );

  if (loading) return <Shell><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Shell>;
  if (!event) return <Shell><h1 className="font-serif text-heading text-accent mb-3">Event not found</h1><Link to="/events" className="text-accent underline font-body">Back to events</Link></Shell>;

  if (!event.registration_enabled) {
    return <Shell><h1 className="font-serif text-heading text-accent mb-3">{event.title}</h1>
      <p className="font-body text-muted-foreground">Registration is not open for this event.</p></Shell>;
  }

  if (done) {
    return <Shell><h1 className="font-serif text-heading text-accent mb-3">You’re registered</h1>
      <p className="font-body text-muted-foreground">Thank you for registering for <strong>{event.title}</strong>.</p>
      <Link to="/events" className="inline-block mt-6 text-accent underline font-body">Back to events</Link></Shell>;
  }

  const membersOnly = event.registration_audience === 'members';

  return (
    <Shell>
      <h1 className="font-serif text-heading text-accent mb-1">{event.title}</h1>
      <p className="font-body text-muted-foreground mb-1">{new Date(event.start_at || event.date).toLocaleString()} · {event.place}</p>
      <p className="font-body text-xs text-muted-foreground mb-6">Open to: {AUDIENCE_LABELS[event.registration_audience]}</p>

      {membersOnly && !user ? (
        <div className="font-body">
          <p className="text-muted-foreground mb-4">This event is for association members. Please sign in to register.</p>
          <Button asChild><Link to="/auth" state={{ from: `/events/${id}/register` }}>Sign in</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 font-body">
          {!user && (
            <>
              <div className="space-y-1"><Label>Full name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required /></div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required /></div>
            </>
          )}
          {user && <p className="text-sm text-muted-foreground">Registering as <strong>{user.email}</strong>.</p>}
          <Button type="submit" disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering…</> : 'Register'}</Button>
        </form>
      )}
    </Shell>
  );
}
