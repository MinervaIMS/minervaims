import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton } from '@/components/shared/AuthUI';

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

  const missOutCopy = (
    <div className="font-body text-left" style={{ fontSize: '14px', color: '#404040', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '12px', color: '#141414' }}>
        Before you go, here is what you will no longer receive:
      </p>
      <ul style={{ paddingLeft: '18px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <li>Announcements when applications open, along with deadline reminders.</li>
        <li>Invitations to public events, guest lectures, and panel discussions.</li>
        <li>Updates on new research publications from our five divisions.</li>
        <li>Occasional Society news, milestones, and alumni highlights.</li>
      </ul>
      <p style={{ marginTop: '14px', color: '#737373' }}>
      </p>
    </div>
  );

  return (
    <AuthLayout
      title="Unsubscribe"
      cardTitle="Unsubscribe from Minerva IMS"
      cardSubtitle="Confirm below to stop receiving emails from the Society at this address."
    >
      {state === 'validating' && (
        <div className="flex items-center justify-center gap-2 py-4 font-body" style={{ color: '#737373', fontSize: '14px' }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
        </div>
      )}

      {state === 'ready' && (
        <div className="space-y-6">
          {missOutCopy}
          <AuthButton onClick={confirm} className="w-full">
            Confirm unsubscribe
          </AuthButton>
        </div>
      )}

      {state === 'confirming' && (
        <div className="flex items-center justify-center gap-2 py-4 font-body" style={{ color: '#737373', fontSize: '14px' }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Processing…
        </div>
      )}

      {state === 'success' && (
        <p className="font-body text-center" style={{ fontSize: '14.5px', color: '#141414', lineHeight: 1.6 }}>
          You have been unsubscribed. You will no longer receive emails from Minerva IMS at this address. If you change your mind, you can resubscribe from any future signup form on our website.
        </p>
      )}

      {state === 'already' && (
        <p className="font-body text-center" style={{ fontSize: '14.5px', color: '#141414', lineHeight: 1.6 }}>
          This address has already been unsubscribed. You will not receive further emails from Minerva IMS.
        </p>
      )}

      {state === 'invalid' && (
        <p className="font-body text-center" style={{ fontSize: '14.5px', color: '#b91c1c', lineHeight: 1.6 }}>
          This unsubscribe link is invalid or has expired. If you continue to receive unwanted emails, please contact us at as.minerva@unibocconi.it.
        </p>
      )}

      {state === 'error' && (
        <p className="font-body text-center" style={{ fontSize: '14.5px', color: '#b91c1c', lineHeight: 1.6 }}>
          {error || 'Something went wrong. Please try again.'}
        </p>
      )}
    </AuthLayout>
  );
}
