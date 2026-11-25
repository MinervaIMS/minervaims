import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EventCardShell } from '@/components/events/EventCardShell';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isShortTarget, readShortCode, type ShortKind } from '@/lib/short-links';

// =====================================================================
// minervaims.org/e/<code> and /f/<code> (Step 108): a short link opens the
// page it stands for, in place of this one (so Back does not return here).
// A code that leads nowhere says so, with the way to the events.
// =====================================================================

export default function ShortLink({ kind }: { kind: ShortKind }) {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const c = readShortCode(code);
    if (!c) { setMissing(true); return; }
    let live = true;
    (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
      'short_link_target', { p_kind: kind, p_code: c },
    ).then(({ data, error }) => {
      if (!live) return;
      if (!error && isShortTarget(kind, data)) navigate(data, { replace: true });
      else setMissing(true);
    }).catch(() => { if (live) setMissing(true); });
    return () => { live = false; };
  }, [code, kind, navigate]);

  return (
    <EventCardShell title={missing ? 'Link not found' : 'Opening the link'} description="A short link of Minerva Investment Management Society.">
      {missing ? (
        <div className="text-center font-body">
          <h1 className="mb-3 font-serif text-2xl text-accent text-balance sm:text-3xl">This link leads nowhere</h1>
          <p className="mx-auto max-w-[460px] text-muted-foreground">
            {kind === 'e'
              ? 'The event may have ended or its registration may have closed. Its page is on the Events page while it is listed.'
              : 'The form may have been withdrawn. Ask whoever sent you the link.'}
          </p>
          <div className="mt-7">
            <Link to={kind === 'e' ? '/events' : '/'} className="text-accent underline underline-offset-2">
              {kind === 'e' ? 'See the events' : 'Go to the home page'}
            </Link>
          </div>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 py-10 font-body text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Opening the link
        </p>
      )}
    </EventCardShell>
  );
}
