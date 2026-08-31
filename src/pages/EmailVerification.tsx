import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import {
  AuthButton,
  AuthErrorBanner,
  AuthField,
  AUTH_TOKENS,
  AuthLink,
} from '@/components/shared/AuthUI';
import {
  captureAuthLink,
  clearAuthLink,
  describeTokenError,
  safeNextPath,
  type CapturedAuthLink,
} from '@/lib/auth-link';

const RESEND_SECONDS = 45;
const emailSchema = z.string().email('Please enter a valid email address.');

type OtpType = 'signup' | 'invite' | 'email_change' | 'email' | 'magiclink';

const STEPS = [
  <>Open the message from Minerva IMS in your inbox.</>,
  <>Return to this page and press <strong style={{ color: AUTH_TOKENS.INK, fontWeight: 600 }}>Confirm My Email</strong>.</>,
  <>Continue to the Workspace.</>,
];

/**
 * Confirmation happens ONLY from the button below, never on mount.
 *
 * Mail-security scanners open every link in a message, and the JavaScript
 * capable ones execute the page: a redemption inside a mount effect is spent
 * before the student ever clicks. The same effect also re-fires on remount,
 * back-navigation, bfcache restore and refresh, so it let users burn their own
 * token. The token is captured (and kept for this tab, so a refresh is safe)
 * but redeemed exclusively in a click handler.
 *
 * The six-digit code from the same email is accepted as a fallback, since a
 * detonation sandbox that clicks buttons cannot type a code.
 */
const EmailVerification = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [link, setLink] = useState<CapturedAuthLink>({});
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [failure, setFailure] = useState<string | null>(
    params.get('status') === 'expired'
      ? 'This verification link has already been used or has expired.'
      : null,
  );
  const [isVerifying, setIsVerifying] = useState(false);
  // Set when the server recognises this spent link as one of ours, belonging to
  // an address that is already confirmed. A second click is then a reassurance,
  // not an error.
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);


  const [useCode, setUseCode] = useState(false);
  const [code, setCode] = useState('');
  const [fieldErr, setFieldErr] = useState<{ email?: string; code?: string }>({});

  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const captured = captureAuthLink(params);
    setLink(captured);
    if (captured.email) setEmail((e) => e || captured.email!);
    // Runs once: capture before anything else rewrites the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  /**
   * Where a freshly confirmed account belongs.
   *
   * A member (anyone holding a role) lands on the Workspace dashboard; an
   * applicant, who holds no role, lands on the status page of their
   * application - the one thing they came to see. An explicit `next` from the
   * link still wins, because it was chosen deliberately.
   *
   * THE ROLE READ IS RETRIED. It runs milliseconds after the session was
   * minted, and a read that comes back empty because the token was not yet
   * attached would send a Head of Division to the applicant status page. When
   * it is still inconclusive, the landing is the bare `/workspace`, which the
   * workspace itself canonicalises to the first section the viewer can open -
   * never a guess that could be wrong.
   */
  const finishSuccess = async (userId: string) => {
    clearAuthLink();
    const next = safeNextPath(link.next);
    if (next !== '/') {
      navigate(next, { replace: true, state: { justConfirmed: true } });
      return;
    }

    let hasRole = false;
    let readSucceeded = false;
    for (let attempt = 0; attempt < 3 && !hasRole; attempt += 1) {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1);
      if (!error) {
        readSucceeded = true;
        hasRole = !!data && data.length > 0;
      }
      if (!hasRole) await new Promise((r) => setTimeout(r, 250));
    }

    let landing = '/workspace';
    if (hasRole) {
      landing = '/workspace/dashboard';
    } else if (readSucceeded) {
      // No role at all: an applicant, provided they really have an application
      // on file. If they don't, the workspace decides where they belong.
      const { data: app } = await supabase
        .from('applications').select('id').eq('user_id', userId).limit(1);
      if (app && app.length > 0) landing = '/workspace/applications/status';
    }
    navigate(landing, { replace: true, state: { justConfirmed: true } });
  };

  /**
   * A second click on a link that already did its job.
   *
   * Tokens are single-use and cannot be made otherwise, so the honest kindness
   * is to recognise the situation: we ask the server whether this exact link
   * was one we issued and whether the account is now confirmed. If so the page
   * says "already confirmed" with a way onwards, instead of accusing a student
   * of holding an invalid link they used correctly.
   */
  const describeSpentLink = async (tokenHash: string, fallback: string) => {
    try {
      const { data } = await supabase.functions.invoke('auth-link-status', {
        body: { token_hash: tokenHash },
      });
      if (data?.status === 'already_confirmed') {
        setAlreadyConfirmed(true);
        setFailure(null);
        return;
      }
    } catch {
      /* fall through to the plain message */
    }
    setFailure(fallback);
  };



  const confirmWithLink = async () => {
    if (isVerifying || !link.tokenHash) return;
    setIsVerifying(true);
    setFailure(null);
    try {
      const type = ((link.type ?? 'signup') as OtpType);
      const { data, error } = await supabase.auth.verifyOtp({
        type: type === 'email_change' ? 'email_change' : type,
        token_hash: link.tokenHash,
      });
      if (error || !data.session) {
        await describeSpentLink(link.tokenHash, describeTokenError(error?.message, 'verification'));
        return;
      }

      await finishSuccess(data.session.user.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const confirmWithCode = async () => {
    if (isVerifying) return;
    const next: typeof fieldErr = {};
    if (!emailSchema.safeParse(email).success) next.email = 'Please enter a valid email address.';
    if (!/^\d{6}$/.test(code.trim())) next.code = 'Enter the six-digit code from the email.';
    setFieldErr(next);
    if (Object.keys(next).length > 0) return;

    setIsVerifying(true);
    setFailure(null);
    try {
      const codeType: 'signup' | 'invite' | 'magiclink' | 'email_change' =
        link.type === 'invite'
          ? 'invite'
          : link.type === 'magiclink'
            ? 'magiclink'
            : link.type === 'email_change'
              ? 'email_change'
              : 'signup';
      const { data, error } = await supabase.auth.verifyOtp({
        type: codeType,
        email: email.trim(),
        token: code.trim(),
      });
      if (error || !data.session) {
        setFailure('That code is not valid or has expired. Check the most recent email, or request a new one.');
        return;
      }

      await finishSuccess(data.session.user.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    if (seconds > 0 || isSending) return;
    if (!emailSchema.safeParse(email).success) {
      setFieldErr((p) => ({ ...p, email: 'Enter your email so we can send a new link.' }));
      setUseCode(true);
      return;
    }
    setIsSending(true);
    try {
      await supabase.auth.resend({ type: 'signup', email: email.trim() });
      setSeconds(RESEND_SECONDS);
      setFailure(null);
    } finally {
      setIsSending(false);
    }
  };

  const hasLink = !!link.tokenHash;

  return (
    <AuthLayout
      title={hasLink ? 'Confirm Your Email' : 'One More Step'}
      cardTitle={hasLink ? 'Confirm Your Email' : 'One More Step'}
      cardSubtitle={
        hasLink
          ? 'Press the button below to confirm your address and activate your account.'
          : "We verify every member's email to keep the Workspace secure."
      }
    >
      {failure && <AuthErrorBanner>{failure}</AuthErrorBanner>}

      {!hasLink && !useCode && (
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
      )}

      {useCode && (
        <>
          <AuthField
            id="email"
            type="email"
            label="Your email"
            placeholder="name.surname@studbocconi.it"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErr((p) => ({ ...p, email: undefined }));
            }}
            error={fieldErr.email}
            autoComplete="email"
            disabled={isVerifying}
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
              setFieldErr((p) => ({ ...p, code: undefined }));
            }}
            error={fieldErr.code}
            hint="The six-digit code from a Minerva verification email, if you have one."
            disabled={isVerifying}
          />
          <AuthButton onClick={confirmWithCode} disabled={isVerifying}>
            {isVerifying ? 'Confirming…' : 'Confirm With Code'}
          </AuthButton>
        </>
      )}

      {!useCode && hasLink && (
        <AuthButton onClick={confirmWithLink} disabled={isVerifying}>
          {isVerifying ? 'Confirming…' : 'Confirm My Email'}
        </AuthButton>
      )}

      {!useCode && !hasLink && (
        <AuthButton onClick={() => navigate('/auth')}>Continue</AuthButton>
      )}

      <p className="font-body text-center mt-5" style={{ fontSize: '13px', color: AUTH_TOKENS.MUTED }}>
        <AuthLink onClick={() => setUseCode((v) => !v)} disabled={isVerifying}>
          {useCode ? 'Use the link from the email instead' : 'Use the six-digit code from the email instead'}
        </AuthLink>
      </p>

      <p className="font-body text-center mt-2" style={{ fontSize: '13px', color: AUTH_TOKENS.MUTED }}>
        {seconds > 0 ? (
          `A new email can be requested in ${seconds}s`
        ) : (
          <>
            Didn't receive it?{' '}
            <AuthLink onClick={resend} disabled={isSending}>
              Send a new email
            </AuthLink>
          </>
        )}
      </p>
    </AuthLayout>
  );
};

export default EmailVerification;
