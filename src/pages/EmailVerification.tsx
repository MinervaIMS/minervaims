import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import {
  AuthButton,
  AuthSteps,
  AuthErrorBanner,
  AUTH_TOKENS,
  AuthLink,
} from '@/components/shared/AuthUI';

const RESEND_SECONDS = 45;

const EmailVerification = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') ?? '';
  const expired = params.get('status') === 'expired';

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

  if (expired) {
    return (
      <AuthLayout
        title="Verification link expired"
        cardTitle="Verification link expired"
        cardSubtitle="This link is no longer valid. We can send a fresh verification email to your address."
      >
        <AuthErrorBanner>This verification link has expired.</AuthErrorBanner>
        <AuthButton onClick={resend} disabled={seconds > 0 || isSending || !email}>
          {seconds > 0 ? `Send a new link in ${seconds}s` : 'Send a new link'}
        </AuthButton>
        <p className="font-body text-center mt-5" style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}>
          <AuthLink onClick={() => navigate('/auth')}>Change email address</AuthLink>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="One more step"
      cardTitle="One more step"
      cardSubtitle="We verify every member's email to keep the Workspace secure."
    >
      <AuthSteps
        items={[
          'Open the email we just sent you.',
          'Click Verify email inside the message.',
          'Return here and continue to your Workspace.',
        ]}
      />
      <AuthButton onClick={() => navigate('/auth')}>Continue</AuthButton>
      <p className="font-body text-center mt-5" style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}>
        Didn't receive it?{' '}
        <AuthLink onClick={resend} disabled={seconds > 0 || isSending || !email}>
          {seconds > 0 ? `Resend in ${seconds}s` : 'Resend email'}
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

export default EmailVerification;
