import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import AuthLayout from '@/components/shared/AuthLayout';
import { PageLoader } from '@/components/shared/PageLoader';
import {
  AuthField,
  AuthPasswordField,
  AuthButton,
  AuthErrorBanner,
  AUTH_TOKENS,
} from '@/components/shared/AuthUI';
import { PasswordStrengthIndicator } from '@/components/shared/PasswordStrengthIndicator';
import { WORKSPACE_BASE } from '@/lib/workspace-base';
import {
  isAllowedBocconiEmail, DOMAIN_REJECTED_MESSAGE, EMAIL_PLACEHOLDER, ALLOWED_DOMAINS_SENTENCE,
} from '@/lib/bocconi-email';

const emailSchema = z.string().email('Please enter a valid email address.');
const passwordSchema = z.string().min(8, 'Use at least 8 characters.');

type Mode = 'login' | 'signup';

const Auth = () => {
  const [mode, setMode] = useState<Mode>('login');

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginInvalid, setLoginInvalid] = useState(false);

  // Sign-up
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [suErr, setSuErr] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading, signIn, signUp } = useAuth();

  useEffect(() => {
    if (!isLoading && user) navigate(WORKSPACE_BASE, { replace: true });
  }, [user, isLoading, navigate]);

  /* -------- Login -------- */
  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    setLoginInvalid(false);

    const emailOk = emailSchema.safeParse(email).success;
    const passOk = password.length >= 6;
    if (!emailOk || !passOk) {
      setLoginInvalid(true);
      setLoginErr('Invalid email or password. Please check your details and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password, rememberMe);
      if (error) {
        setLoginInvalid(true);
        setLoginErr('Invalid email or password. Please check your details and try again.');
        return;
      }
      toast({ title: 'Welcome back', description: 'Signed in to the Minerva Workspace.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -------- Sign-up -------- */
  const validateSignup = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Required.';
    if (!surname.trim()) errs.surname = 'Required.';
    if (!emailSchema.safeParse(suEmail).success) errs.email = 'Please enter a valid email address.';
    // THE DOMAIN IS CHECKED BEFORE THE ACCOUNT IS CREATED, so a private
    // address is a sentence under the field rather than a confirmation
    // email for an account that will not be allowed to do anything. The
    // list it reads is the same one the endpoint and the email hook read.
    else if (!isAllowedBocconiEmail(suEmail)) errs.email = DOMAIN_REJECTED_MESSAGE;
    if (!passwordSchema.safeParse(suPassword).success) errs.password = 'Use at least 8 characters.';
    if (suConfirm !== suPassword) errs.confirm = 'Passwords do not match.';
    if (!terms) errs.terms = 'Please accept the terms to continue.';
    setSuErr(errs);
    return Object.keys(errs).length === 0;
  };

  // =====================================================================
  // A DISABLED BUTTON MUST NEVER BE AN UNEXPLAINED ONE.
  // ---------------------------------------------------------------------
  // The domain rule is part of `signupValid` below, which is how every
  // other rule on this form works: the button stays inert until the form
  // is complete. The others explain themselves by being visible - two
  // password fields that differ, an unticked box - and a domain does not.
  // Somebody typing a private address would meet a button that refuses to
  // work and no reason anywhere on the page.
  //
  // So the reason appears AS THEY TYPE, and only once the address is far
  // enough along to judge: a well-formed address on a domain that is not
  // ours. Half-typed input is not corrected at somebody mid-word.
  // =====================================================================
  const domainWarning =
    emailSchema.safeParse(suEmail).success && !isAllowedBocconiEmail(suEmail)
      ? DOMAIN_REJECTED_MESSAGE
      : '';

  const signupValid =
    name.trim().length > 0 &&
    surname.trim().length > 0 &&
    emailSchema.safeParse(suEmail).success &&
    isAllowedBocconiEmail(suEmail) &&
    passwordSchema.safeParse(suPassword).success &&
    suConfirm === suPassword &&
    suConfirm.length > 0 &&
    terms;

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    setIsSubmitting(true);
    try {
      const { error } = await signUp(suEmail, suPassword, `${name.trim()} ${surname.trim()}`);
      if (error) {
        if (error.message?.toLowerCase().includes('already')) {
          setSuErr({ email: 'An account with this email already exists. Sign in instead, or contact as.minerva@unibocconi.it if you cannot access it.' });
        } else {
          toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
        }
        return;
      }
      navigate(`/check-email?email=${encodeURIComponent(suEmail)}&purpose=verify`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Uniform page loader: the same treatment used by every route while it loads.
  if (isLoading) {
    return <PageLoader />;
  }

  /* -------- Render -------- */
  if (mode === 'signup') {
    return (
      <AuthLayout
        title="Create Your Account"
        cardTitle="Create Your Account"
        cardSubtitle={'Access the Minerva Workspace.\nFrom application to membership.\n'}
      >
        <form onSubmit={submitSignup} noValidate>
          <div className="grid grid-cols-2 gap-3.5">
            <AuthField
              id="name"
              label="Name"
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={suErr.name}
              autoComplete="given-name"
              disabled={isSubmitting}
            />
            <AuthField
              id="surname"
              label="Surname"
              placeholder="Last name"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              error={suErr.surname}
              autoComplete="family-name"
              disabled={isSubmitting}
            />
          </div>
          <AuthField
            id="suEmail"
            type="email"
            label="Email"
            placeholder={EMAIL_PLACEHOLDER}
            value={suEmail}
            onChange={(e) => setSuEmail(e.target.value)}
            error={suErr.email || domainWarning}
            hint={`Use your Bocconi address (${ALLOWED_DOMAINS_SENTENCE}), in the form name.surname. A matriculation number such as 3243000@studbocconi.it is not valid for registration.`}
            autoComplete="email"
            disabled={isSubmitting}
          />

          <AuthPasswordField
            id="suPassword"
            label="Password"
            placeholder="Enter your password"
            value={suPassword}
            onChange={(e) => setSuPassword(e.target.value)}
            error={suErr.password}
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          {suPassword.length > 0 && (
            <div className="-mt-3 mb-4">
              <PasswordStrengthIndicator password={suPassword} />
            </div>
          )}
          <AuthPasswordField
            id="suConfirm"
            label="Confirm password"
            placeholder="Re-enter your password"
            value={suConfirm}
            onChange={(e) => setSuConfirm(e.target.value)}
            error={suErr.confirm}
            autoComplete="new-password"
            disabled={isSubmitting}
          />


          <label
            className="font-body flex items-start gap-2 mb-5 cursor-pointer"
            style={{ fontSize: '13px', color: AUTH_TOKENS.MUTED, lineHeight: 1.5 }}
          >
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              style={{ marginTop: '3px', accentColor: AUTH_TOKENS.NAVY }}
            />
            <span>
              I have read and accept the{' '}
              <Link to="/terms-of-use" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
                Terms of Use
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {suErr.terms && (
            <p className="font-body -mt-3 mb-4" style={{ fontSize: '12.5px', color: AUTH_TOKENS.ERROR }}>
              {suErr.terms}
            </p>
          )}

          <AuthButton type="submit" disabled={!signupValid || isSubmitting}>
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
          </AuthButton>

        </form>

        <p
          className="font-body text-center mt-5"
          style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}
        >
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => setMode('login')}
            className="font-body"
            style={{
              color: AUTH_TOKENS.NAVY,
              textDecoration: 'underline',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign In" cardTitle="Welcome Back" cardSubtitle={'Access the Minerva Workspace.\nFrom application to membership.\n'}>
      <form onSubmit={submitLogin} noValidate>
        {loginErr && <AuthErrorBanner>{loginErr}</AuthErrorBanner>}
        <AuthField
          id="email"
          type="email"
          label="Email"
          placeholder={EMAIL_PLACEHOLDER}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setLoginInvalid(false);
            setLoginErr(null);
          }}
          error={loginInvalid ? ' ' : undefined}
          autoComplete="email"
          disabled={isSubmitting}
        />
        <AuthPasswordField
          id="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setLoginInvalid(false);
            setLoginErr(null);
          }}
          error={loginInvalid ? ' ' : undefined}
          autoComplete="current-password"
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between mb-5">
          <label
            className="font-body flex items-center gap-2 cursor-pointer"
            style={{ fontSize: '13px', color: AUTH_TOKENS.MUTED }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: AUTH_TOKENS.NAVY }}
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="font-body"
            style={{ color: AUTH_TOKENS.NAVY, fontSize: '13px', textDecoration: 'underline' }}
          >
            Forgot password?
          </Link>
        </div>

        <AuthButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing In…' : 'Sign In'}
        </AuthButton>
      </form>


      <p
        className="font-body text-center mt-5"
        style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}
      >
        New here?{' '}
        <button
          type="button"
          onClick={() => setMode('signup')}
          className="font-body"
          style={{
            color: AUTH_TOKENS.NAVY,
            textDecoration: 'underline',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          Create an account
        </button>
      </p>
    </AuthLayout>
  );
};

export default Auth;
