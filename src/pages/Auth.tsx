import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import AuthLayout from '@/components/shared/AuthLayout';
import {
  AuthField,
  AuthPasswordField,
  AuthButton,
  AuthErrorBanner,
  AUTH_TOKENS,
} from '@/components/shared/AuthUI';
import { PasswordStrengthIndicator } from '@/components/shared/PasswordStrengthIndicator';

const emailSchema = z.string().email('Please enter a valid email address.');
const passwordSchema = z.string().min(8, 'Use at least 8 characters.');
const bocconiEmail = /@(studbocconi\.it|unibocconi\.it)$/i;

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
    if (!isLoading && user) navigate('/admin', { replace: true });
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
    else if (!bocconiEmail.test(suEmail))
      errs.email = 'Use your @studbocconi.it or @unibocconi.it address.';
    if (!passwordSchema.safeParse(suPassword).success) errs.password = 'Use at least 8 characters.';
    if (suConfirm !== suPassword) errs.confirm = 'Passwords do not match.';
    if (!terms) errs.terms = 'Please accept the terms to continue.';
    setSuErr(errs);
    return Object.keys(errs).length === 0;
  };

  const signupValid =
    name.trim().length > 0 &&
    surname.trim().length > 0 &&
    emailSchema.safeParse(suEmail).success &&
    bocconiEmail.test(suEmail) &&
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
          setSuErr({ email: 'An account with this email already exists.' });
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: AUTH_TOKENS.MUTED }} />
      </div>
    );
  }

  /* -------- Render -------- */
  if (mode === 'signup') {
    return (
      <AuthLayout
        title="Create Your Account"
        cardTitle="Create Your Account"
        cardSubtitle="Access the Minerva Workspace."
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
            placeholder="name.surname@studbocconi.it"
            value={suEmail}
            onChange={(e) => setSuEmail(e.target.value)}
            error={suErr.email}
            hint="Use your @studbocconi.it or @unibocconi.it address."
            autoComplete="email"
            disabled={isSubmitting}
          />

          <AuthPasswordField
            id="suPassword"
            label="Password"
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
            {isSubmitting ? 'Creating account…' : 'Create account'}
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
    <AuthLayout title="Sign in" cardTitle="Welcome back" cardSubtitle="Access the Minerva Workspace.">
      <form onSubmit={submitLogin} noValidate>
        {loginErr && <AuthErrorBanner>{loginErr}</AuthErrorBanner>}
        <AuthField
          id="email"
          type="email"
          label="Email"
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
          {isSubmitting ? 'Signing in…' : 'Sign in'}
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
