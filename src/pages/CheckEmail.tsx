import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton, AUTH_TOKENS, AuthLink, EmailDeliverySteps } from '@/components/shared/AuthUI';

const RESEND_SECONDS = 45;

function maskEmail(addr: string) {
  const [name, domain] = addr.split('@');
  if (!name || !domain) return addr;
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

const CheckEmail = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const emailParam = params.get('email') ?? '';
  const purpose = params.get('purpose') ?? 'reset';
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  const resend = async () => {
    if (seconds > 0 || !emailParam) return;
    setIsSending(true);
    try {
      if (purpose === 'reset') {
        await supabase.auth.resetPasswordForEmail(emailParam, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      } else {
        await supabase.auth.resend({ type: 'signup', email: emailParam });
      }
      setSeconds(RESEND_SECONDS);
    } finally {
      setIsSending(false);
    }
  };

  const subtitle =
    purpose === 'verify'
      ? `A verification link is on its way to ${maskEmail(emailParam)}.`
      : `A reset link is on its way to ${maskEmail(emailParam)}.`;

  return (
    <AuthLayout title="Check Your Email" cardTitle="Check Your Email" cardSubtitle={subtitle}>

      {/* The same guidance, in the same words, as the application flow: both
          screens wait on the same provider, so both state the same window and
          emphasise the same two things. This page used to hand-roll its own
          copy of the numbered list; it now shares the component. */}
      <EmailDeliverySteps />

      <AuthButton onClick={resend} disabled={seconds > 0 || isSending}>
        {seconds > 0 ? `Resend Email In ${seconds}s` : isSending ? 'Sending…' : 'Resend Email'}
      </AuthButton>


      <p className="font-body text-center mt-5" style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}>
        <AuthLink onClick={() => navigate(purpose === 'verify' ? '/auth' : '/forgot-password')}>
          Change email address
        </AuthLink>
      </p>
      <p className="font-body text-center mt-2" style={{ fontSize: '13px', color: AUTH_TOKENS.MUTED }}>
        <Link to="/auth" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
          Back to sign-in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default CheckEmail;
