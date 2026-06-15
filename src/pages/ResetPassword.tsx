import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import {
  AuthPasswordField,
  AuthButton,
  AuthErrorBanner,
  AUTH_TOKENS,
} from '@/components/shared/AuthUI';
import { PasswordStrengthIndicator } from '@/components/shared/PasswordStrengthIndicator';

const passwordSchema = z.string().min(8, 'Use at least 8 characters.');

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<{ password?: string; confirm?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase v2 places tokens in URL hash on recovery links; client auto-detects them.
    // Confirm a session is available to proceed.
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const hashType = window.location.hash.includes('type=recovery');
      const queryType = searchParams.get('type') === 'recovery';
      setReady(!!data.session || hashType || queryType);
    });
    return () => {
      active = false;
    };
  }, [searchParams]);

  const matches = password.length > 0 && password === confirm;
  const valid = passwordSchema.safeParse(password).success && matches;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof err = {};
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) next.password = parsed.error.errors[0].message;
    if (password !== confirm) next.confirm = 'Passwords do not match.';
    setErr(next);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    setBanner(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setBanner("We couldn't update your password. The reset link may have expired.");
        navigate('/password-reset-success?status=error', { replace: true });
        return;
      }
      navigate('/password-reset-success', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      cardTitle="Set a new password"
      cardSubtitle="Choose a strong password you don't use elsewhere."
    >
      {!ready && (
        <AuthErrorBanner>
          This reset link is invalid or has expired. <Link to="/forgot-password" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>Request a new one</Link>.
        </AuthErrorBanner>
      )}
      {banner && <AuthErrorBanner>{banner}</AuthErrorBanner>}
      <form onSubmit={submit} noValidate>
        <AuthPasswordField
          id="password"
          label="New password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErr((p) => ({ ...p, password: undefined }));
          }}
          error={err.password}
          autoComplete="new-password"
          disabled={isSubmitting || !ready}
        />
        {password.length > 0 && (
          <div className="-mt-3 mb-4">
            <PasswordStrengthIndicator password={password} />
          </div>
        )}
        <AuthPasswordField
          id="confirm"
          label="Confirm password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setErr((p) => ({ ...p, confirm: undefined }));
          }}
          error={err.confirm}
          autoComplete="new-password"
          disabled={isSubmitting || !ready}
        />
        <AuthButton type="submit" disabled={!valid || isSubmitting || !ready}>
          {isSubmitting ? 'Updating…' : 'Update password'}
        </AuthButton>
      </form>
      <p className="font-body text-center mt-5" style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}>
        <Link to="/auth" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
          Back to sign-in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPassword;
