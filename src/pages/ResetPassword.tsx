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
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    // The emailed link carries a token hash and is redeemed HERE, in the
    // browser, with verifyOtp (a POST). Link scanners that merely open the
    // page cannot consume the token. Older links still arrive with the token
    // in the URL hash, which the auth client picks up on its own — for those
    // we wait for the auth client to settle instead of judging on first read,
    // so a slow connection never turns a valid link into "expired".
    let active = true;
    const tokenHash = searchParams.get('token_hash');

    const finish = (ok: boolean, message?: string) => {
      if (!active) return;
      setReady(ok);
      setLinkError(ok ? null : message ?? null);
      setChecking(false);
    };

    if (tokenHash) {
      supabase.auth
        .verifyOtp({ type: 'recovery', token_hash: tokenHash })
        .then(({ data, error }) => {
          if (error || !data.session) {
            finish(
              false,
              'This reset link has already been used or is no longer valid.',
            );
            return;
          }
          finish(true);
        });
      return () => {
        active = false;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
    });

    // Give the auth client time to process a hash-based recovery link before
    // deciding the link is bad.
    const timer = window.setTimeout(() => {
      const hashType = window.location.hash.includes('type=recovery');
      finish(hashType, hashType ? undefined : 'This reset link is invalid or has expired.');
      if (hashType) return;
    }, 2500);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
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
      title="Set A New Password"
      cardTitle="Set A New Password"
      cardSubtitle="Choose a strong password you don't use elsewhere."
    >
      {!ready && !checking && (
        <AuthErrorBanner>
          {linkError ?? 'This reset link is invalid or has expired.'}{' '}
          <Link to="/forgot-password" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>Send me a new link</Link>.
        </AuthErrorBanner>
      )}
      {banner && <AuthErrorBanner>{banner}</AuthErrorBanner>}
      <form onSubmit={submit} noValidate>
        <AuthPasswordField
          id="password"
          label="New password"
          placeholder="Enter new password"
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
          placeholder="Re-enter new password"
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
          {isSubmitting ? 'Updating…' : 'Update Password'}
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
