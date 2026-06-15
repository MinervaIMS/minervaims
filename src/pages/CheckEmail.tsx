import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton, AUTH_TOKENS, AuthLink } from '@/components/shared/AuthUI';

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
    <AuthLayout title="Check your email" cardTitle="Check your email" cardSubtitle={subtitle}>
      <ol
        className="font-body mb-6"
        style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', color: AUTH_TOKENS.MUTED }}
      >
        {['It can take a minute or two to arrive.', 'No email? Check your spam or promotions folder.'].map(
          (s, i) => (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr',
                gap: '12px',
                marginBottom: '12px',
                fontSize: '13.5px',
                lineHeight: 1.55,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  border: `1px solid ${AUTH_TOKENS.NAVY}`,
                  color: AUTH_TOKENS.NAVY,
                  fontFamily: "'Times New Roman', Times, Georgia, serif",
                  fontSize: '13px',
                }}
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ),
        )}
      </ol>

      <AuthButton onClick={resend} disabled={seconds > 0 || isSending}>
        {seconds > 0 ? `Resend email in ${seconds}s` : isSending ? 'Sending…' : 'Resend email'}
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
