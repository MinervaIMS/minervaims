import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type State = 'validating' | 'ready' | 'already' | 'invalid' | 'confirming' | 'success' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>('validating');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    (async () => {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: supabaseAnonKey } },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState('invalid');
          return;
        }
        if (data.valid === false && data.reason === 'already_unsubscribed') {
          setState('already');
          return;
        }
        setState('ready');
      } catch {
        setState('invalid');
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState('confirming');
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success === false && data?.reason === 'already_unsubscribed') {
        setState('already');
        return;
      }
      if (data?.success) {
        setState('success');
        return;
      }
      throw new Error('Unexpected response');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setState('error');
    }
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 border border-separator bg-white p-10">
        <h1 className="font-serif text-3xl text-accent">Unsubscribe</h1>

        {state === 'validating' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground font-body">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </div>
        )}

        {state === 'ready' && (
          <>
            <p className="font-body text-sm text-muted-foreground">
              Confirm below to stop receiving emails from Minerva IMS at this address.
            </p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}

        {state === 'confirming' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground font-body">
            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
          </div>
        )}

        {state === 'success' && (
          <p className="font-body text-sm">
            You have been unsubscribed. You will no longer receive emails from Minerva IMS at this address.
          </p>
        )}

        {state === 'already' && (
          <p className="font-body text-sm">This address has already been unsubscribed.</p>
        )}

        {state === 'invalid' && (
          <p className="font-body text-sm text-destructive">
            This unsubscribe link is invalid or has expired. If you continue to receive unwanted emails, please contact us.
          </p>
        )}

        {state === 'error' && (
          <p className="font-body text-sm text-destructive">{error || 'Something went wrong. Please try again.'}</p>
        )}
      </div>
    </main>
  );
}
