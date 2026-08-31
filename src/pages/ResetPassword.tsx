import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import {
  AuthField,
  AuthPasswordField,
  AuthButton,
  AuthErrorBanner,
  AUTH_TOKENS,
  AuthLink,
} from '@/components/shared/AuthUI';
import { PasswordStrengthIndicator } from '@/components/shared/PasswordStrengthIndicator';
import {
  captureAuthLink,
  clearAuthLink,
  describeTokenError,
  type CapturedAuthLink,
} from '@/lib/auth-link';

const passwordSchema = z.string().min(8, 'Use at least 8 characters.');
const emailSchema = z.string().email('Please enter a valid email address.');

/**
 * ONE STEP, ON PURPOSE.
 *
 * The page does not verify the emailed token on arrival. It shows the password
 * fields straight away and redeems the token inside the submit handler, back to
 * back with the password update. Two consequences, both deliberate:
 *
 *  - a link scanner that merely opens (or even renders) this page cannot spend
 *    the token, because nothing is redeemed without a form submission;
 *  - the token dies only on a real completion, so a student who opens the link,
 *    is interrupted and closes the tab has lost nothing.
 *
 * A six-digit code from the same email is accepted as an alternative, for the
 * case of a detonation sandbox that clicks buttons: nothing can type a code on
 * the student's behalf.
 */
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Captured once, never redeemed here. Survives a refresh via sessionStorage.
  const [link, setLink] = useState<CapturedAuthLink>({});
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [useCode, setUseCode] = useState(false);
  const [codeEmail, setCodeEmail] = useState('');
  const [code, setCode] = useState('');

  const [err, setErr] = useState<{ password?: string; confirm?: string; code?: string; email?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const captured = captureAuthLink(searchParams);
    setLink(captured);
    if (captured.email) setCodeEmail(captured.email);
    // Legacy links put the token in the URL hash and the auth client redeems it
    // by itself; that path still works, so a session is enough to proceed.
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });
    return () => sub.subscription.unsubscribe();
    // Runs once: the token must be captured before anything else touches the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches = password.length > 0 && password === confirm;
  const valid = passwordSchema.safeParse(password).success && matches;
  const canAttempt = useMemo(
    () => !!link.tokenHash || hasSession || useCode,
    [link.tokenHash, hasSession, useCode],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const next: typeof err = {};
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) next.password = parsed.error.errors[0].message;
    if (password !== confirm) next.confirm = 'Passwords do not match.';
    if (useCode) {
      if (!emailSchema.safeParse(codeEmail).success) next.email = 'Please enter a valid email address.';
      if (!/^\d{6}$/.test(code.trim())) next.code = 'Enter the six-digit code from the email.';
    }
    setErr(next);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    setBanner(null);
    try {
      // 1. Redeem, only now, at the moment of a real completion.
      if (useCode) {
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          email: codeEmail.trim(),
          token: code.trim(),
        });
        if (error) {
          setBanner('That code is not valid or has expired. Check the most recent email, or request a new one.');
          return;
        }
      } else if (link.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: link.tokenHash,
        });
        if (error) {
          setBanner(describeTokenError(error.message, 'reset'));
          return;
        }
      } else if (!hasSession) {
        setBanner('This reset link is no longer valid. Request a new one below.');
        return;
      }

      // 2. Set the new password on the recovery session just established.
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setBanner("We couldn't update your password. Please request a new reset link.");
        return;
      }

      clearAuthLink();
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
      {banner && (
        <AuthErrorBanner>
          {banner}{' '}
          <Link to="/forgot-password" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
            Send me a new link
          </Link>
          .
        </AuthErrorBanner>
      )}

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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
        />

        {useCode && (
          <>
            <AuthField
              id="codeEmail"
              type="email"
              label="Your email"
              placeholder="name.surname@studbocconi.it"
              value={codeEmail}
              onChange={(e) => {
                setCodeEmail(e.target.value);
                setErr((p) => ({ ...p, email: undefined }));
              }}
              error={err.email}
              autoComplete="email"
              disabled={isSubmitting}
            />
            <AuthField
              id="code"
              label="Six-digit code"
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setErr((p) => ({ ...p, code: undefined }));
              }}
              error={err.code}
              hint="The code printed under the button in the reset email."
              disabled={isSubmitting}
            />
          </>
        )}

        <AuthButton type="submit" disabled={!valid || isSubmitting || !canAttempt}>
          {isSubmitting ? 'Updating…' : 'Update Password'}
        </AuthButton>
      </form>

      <p className="font-body text-center mt-5" style={{ fontSize: '13px', color: AUTH_TOKENS.MUTED }}>
        <AuthLink onClick={() => setUseCode((v) => !v)} disabled={isSubmitting}>
          {useCode ? 'Use the link from the email instead' : 'Use the six-digit code from the email instead'}
        </AuthLink>
      </p>

      <p className="font-body text-center mt-2" style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}>
        <Link to="/auth" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
          Back to sign-in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPassword;
