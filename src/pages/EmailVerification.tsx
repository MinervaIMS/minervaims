import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import {
  AuthButton,
  AuthErrorBanner,
  AUTH_TOKENS,
  AuthLink,
} from '@/components/shared/AuthUI';

const RESEND_SECONDS = 45;

const STEPS = [
  <>Open the message from Minerva IMS in your inbox.</>,
  <>Click <strong style={{ color: AUTH_TOKENS.INK, fontWeight: 600 }}>Verify email</strong> to confirm it's you.</>,
  <>Return here and continue to the Workspace.</>,
];

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
        title="Verification Link Expired"
        cardTitle="Verification Link Expired"
        cardSubtitle="This link is no longer valid. We can send a fresh verification email to your address."
      >
        <AuthErrorBanner>This verification link has expired.</AuthErrorBanner>
        <AuthButton onClick={resend} disabled={seconds > 0 || isSending || !email}>
          {seconds > 0 ? `Send A New Link In ${seconds}s` : 'Send A New Link'}
        </AuthButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="One More Step"
      cardTitle="One More Step"
      cardSubtitle="We verify every member's email to keep the Workspace secure."
    >
      <ol
        className="font-body"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 24px',
          borderTop: `1px solid ${AUTH_TOKENS.HAIRLINE}`,
        }}
      >
        {STEPS.map((s, i) => (
          <li
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr',
              gap: '16px',
              alignItems: 'start',
              padding: '18px 0',
              borderBottom: `1px solid ${AUTH_TOKENS.HAIRLINE}`,
              fontSize: '14px',
              lineHeight: 1.55,
              color: AUTH_TOKENS.INK,
            }}
          >
            <span
              style={{
                fontFamily: "'Times New Roman', Times, Georgia, serif",
                fontSize: '17px',
                color: AUTH_TOKENS.NAVY,
                lineHeight: 1.4,
              }}
            >
              {i + 1}
            </span>
            <span style={{ color: AUTH_TOKENS.INK }}>{s}</span>
          </li>
        ))}
      </ol>

      <AuthButton onClick={() => navigate('/auth')}>Continue</AuthButton>

      <p
        className="font-body text-center mt-5"
        style={{ fontSize: '13px', color: AUTH_TOKENS.MUTED }}
      >
        {seconds > 0 ? (
          `Resend available in ${seconds}s`
        ) : (
          <>
            Didn't receive it?{' '}
            <AuthLink onClick={resend} disabled={isSending || !email}>
              Resend email
            </AuthLink>
          </>
        )}
      </p>
    </AuthLayout>
  );
};

export default EmailVerification;
