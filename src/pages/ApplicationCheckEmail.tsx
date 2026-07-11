import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton, AUTH_TOKENS, AuthSteps } from '@/components/shared/AuthUI';

const RESEND_SECONDS = 45;

function maskEmail(addr: string) {
  const [name, domain] = addr.split('@');
  if (!name || !domain) return addr;
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

// Dedicated "confirm your email to finish your application" page, shown right
// after an application is submitted. Uses the same layout as /check-email.
export default function ApplicationCheckEmail() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  const resend = async () => {
    if (seconds > 0 || !email) return;
    setIsSending(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setSeconds(RESEND_SECONDS);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthLayout
      title="Confirm your email"
      cardTitle="Confirm Your Email"
      cardSubtitle={`A verification link is on its way to ${maskEmail(email)}.`}
    >
      <p
        className="font-body mb-6"
        style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED, lineHeight: 1.55 }}
      >
        Confirming your email is required to send your application.
      </p>

      <AuthSteps
        items={[
          'It can take a minute or two to arrive.',
          'No email? Check your spam or promotions folder.',
        ]}
      />

      <AuthButton onClick={resend} disabled={seconds > 0 || isSending || !email}>
        {seconds > 0
          ? `Resend Email In ${seconds}s`
          : isSending
            ? 'Sending…'
            : 'Resend Email'}
      </AuthButton>

      <p className="font-body text-center mt-5" style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}>
        <Link to="/apply" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
          Back to the application
        </Link>
      </p>
    </AuthLayout>
  );
}
