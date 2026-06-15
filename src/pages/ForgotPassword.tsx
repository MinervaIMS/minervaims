import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthField, AuthButton, AUTH_TOKENS } from '@/components/shared/AuthUI';

const emailSchema = z.string().email('Please enter a valid email address.');

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErr(parsed.error.errors[0].message);
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: 'Request failed', description: error.message, variant: 'destructive' });
        return;
      }
      navigate(`/check-email?email=${encodeURIComponent(email)}&purpose=reset`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      cardTitle="Reset your password"
      cardSubtitle="Enter your email and we'll send a secure link to reset your password."
    >
      <form onSubmit={submit} noValidate>
        <AuthField
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErr(undefined);
          }}
          error={err}
          autoComplete="email"
          disabled={isSubmitting}
        />
        <AuthButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
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

export default ForgotPassword;
