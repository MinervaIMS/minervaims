import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthButton } from '@/components/shared/AuthUI';
import { ApplyBackground } from '@/components/shared/ApplyBackground';
import fullLogo from '@/assets/legal-hero-logo.svg';

const RESEND_SECONDS = 45;

function maskEmail(addr: string) {
  const [name, domain] = addr.split('@');
  if (!name || !domain) return addr;
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

// Dedicated "confirm your email to finish your application" page, shown right
// after an application is submitted. Same mechanics as /check-email (resend with
// a cooldown) but its own path and copy: it makes explicit that confirming the
// email is REQUIRED for the application to be sent.
export default function ApplicationCheckEmail() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

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
      setSent(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Helmet><title>Confirm your email | MIMS</title></Helmet>
      <div className="min-h-screen w-full relative flex items-center justify-center px-4 py-12">
        <ApplyBackground />
        <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-2xl border border-separator px-8 py-10 text-center">
          <img src={fullLogo} alt="Minerva Investment Management Society" style={{ height: '84px', width: 'auto' }} className="mx-auto mb-6" />

          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <MailCheck className="h-6 w-6 text-accent" />
          </div>

          <h1 className="font-serif text-accent mb-2" style={{ fontSize: '24px', fontWeight: 400 }}>
            Confirm your email to finish your application
          </h1>
          <p className="font-body text-sm text-muted-foreground mb-5">
            We've sent a verification link to <strong className="text-foreground">{maskEmail(email)}</strong>.
          </p>

          {/* The key requirement, stated plainly. */}
          <div className="flex items-start gap-2 text-left border border-amber-300 bg-amber-50 text-amber-800 rounded-md px-4 py-3 mb-6">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="font-body text-xs leading-relaxed">
              Confirming your email is <strong>required to send your application</strong>. Until you click the link,
              your application is not finalised, you won't become an applicant, and you won't be able to access the
              workspace. The link can take a minute or two to arrive — remember to check your spam or promotions folder.
            </p>
          </div>

          <AuthButton onClick={resend} disabled={seconds > 0 || isSending || !email}>
            {seconds > 0 ? `Resend email in ${seconds}s` : isSending ? 'Sending…' : 'Resend verification email'}
          </AuthButton>
          {sent && seconds > 0 && (
            <p className="font-body text-xs text-muted-foreground mt-3">A fresh verification email is on its way.</p>
          )}

          <p className="font-body text-center mt-5" style={{ fontSize: '13px' }}>
            <Link to="/apply" className="text-accent underline">Back to the application</Link>
          </p>
        </div>
      </div>
    </>
  );
}
