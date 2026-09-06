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

  // ═══════════════════════════════════════════════════════════════════
  // THE TOKEN IS SPENT ONCE, AND THE PAGE REMEMBERS THAT.
  // -------------------------------------------------------------------
  // This is the loop that was reported: the password is changed, the page
  // says it failed, and every retry fails too.
  //
  // `verifyOtp` consumes the emailed token and leaves a live recovery
  // session behind. If the update that follows failed for ANY reason -
  // a dropped response on a phone, a rule the password broke, a rate
  // limit - the old code came back to this form with `link.tokenHash`
  // still set, and pressing the button again redeemed the SAME, now
  // spent, token. That second attempt could only ever answer "this link
  // has already been used", so the page sent the student to ask for
  // another one, and the cycle repeated: the session that would have
  // worked was sitting right there, unused, every time.
  //
  // Once the token has been redeemed, this page never touches it again.
  // A retry goes straight to the update, on the session it already holds.
  // ═══════════════════════════════════════════════════════════════════
  const [redeemed, setRedeemed] = useState(false);
  /** Offer "sign in" as well as "new link" when the password may be set. */
  const [maybeAlreadySet, setMaybeAlreadySet] = useState(false);

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
    () => !!link.tokenHash || hasSession || useCode || redeemed,
    [link.tokenHash, hasSession, useCode, redeemed],
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
    setMaybeAlreadySet(false);
    try {
      // ── 1. Redeem, only now, and ONLY IF IT HAS NOT BEEN REDEEMED ──
      // A second press must not spend a token that is already spent; the
      // recovery session from the first press is what carries the update.
      if (!redeemed) {
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
          setRedeemed(true);
          clearAuthLink();
        } else if (link.tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: link.tokenHash,
          });
          if (error) {
            setBanner(describeTokenError(error.message, 'reset'));
            return;
          }
          // Spent, whatever happens next: forget it so nothing can retry
          // with it, here or after a refresh.
          setRedeemed(true);
          clearAuthLink();
        } else if (!hasSession) {
          setBanner('This reset link is no longer valid. Request a new one below.');
          return;
        }
      }

      // ── 2. Set the new password on the recovery session ──────────────
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        clearAuthLink();
        navigate('/password-reset-success', { replace: true });
        return;
      }

      // ═════════════════════════════════════════════════════════════════
      // A FAILURE HERE IS NOT ONE THING, AND SAYING SO IS THE FIX.
      // -----------------------------------------------------------------
      // The page used to answer every one of these with the same
      // sentence, "we couldn't update your password, request a new
      // link", which is wrong in three of the four cases below and is
      // what kept people going round.
      //
      // THE IMPORTANT ONE IS `same_password`. It means the account's
      // password is ALREADY the one being typed, which is the goal: it is
      // what a student sees when the first attempt succeeded and its
      // response was lost, or when they set it, were told it failed and
      // tried again. Reporting that as a failure and sending them for
      // another link guarantees they can never escape, because the next
      // attempt fails identically. It is a success, and it is treated as
      // one.
      // ═════════════════════════════════════════════════════════════════
      const code$ = (error as { code?: string }).code ?? '';
      const status = (error as { status?: number }).status;
      const text = (error.message ?? '').toLowerCase();

      if (code$ === 'same_password' || text.includes('should be different from the old password')) {
        clearAuthLink();
        navigate('/password-reset-success', { replace: true });
        return;
      }

      if (code$ === 'weak_password' || text.includes('password should be') || text.includes('weak')) {
        setErr((prev) => ({ ...prev, password: error.message || 'Choose a stronger password.' }));
        setBanner(null);
        return;
      }

      if (code$ === 'over_request_rate_limit' || status === 429) {
        setBanner('Too many attempts in a short time. Wait a minute and press Update Password again: your reset link is still good.');
        return;
      }

      // NO HTTP STATUS MEANS THE REQUEST NEVER COMPLETED, and a request
      // that never completed is not a request that never happened: the
      // change may well have been made and only the answer lost. Saying
      // "we couldn't update your password" there is a guess, and it is
      // the guess that starts the loop.
      if (status === undefined) {
        setMaybeAlreadySet(true);
        setBanner('We lost the connection before we could confirm the change. Your new password may already be active: try signing in with it. If it does not work, press Update Password again.');
        return;
      }

      if (code$ === 'session_expired' || code$ === 'bad_jwt' || status === 401) {
        setBanner('This reset link is no longer valid. Request a new one below.');
        return;
      }

      setBanner(error.message
        ? `We couldn't update your password: ${error.message}`
        : "We couldn't update your password. Please try again, or request a new reset link.");
    } catch {
      // Thrown rather than returned: the same "we do not know" case.
      setMaybeAlreadySet(true);
      setBanner('We lost the connection before we could confirm the change. Your new password may already be active: try signing in with it. If it does not work, press Update Password again.');
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
          {/* THE RIGHT EXIT FOR THE RIGHT FAILURE. When the change may
              have gone through, the useful next step is to try signing
              in, not to fetch another link and set the same password
              again. */}
          {maybeAlreadySet ? (
            <Link to="/auth" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
              Go to sign-in
            </Link>
          ) : (
            <Link to="/forgot-password" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
              Send me a new link
            </Link>
          )}
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
