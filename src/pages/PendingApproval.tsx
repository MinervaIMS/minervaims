import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton, AUTH_TOKENS } from '@/components/shared/AuthUI';

type RedeemState = 'checking' | 'linked' | 'no_match' | 'email_in_use' | 'email_unconfirmed' | 'waiting';

const PendingApproval = () => {
  const { user, profile, roles, rolesLoaded, signOut, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [redeem, setRedeem] = useState<RedeemState>('checking');
  const claimTried = useRef(false);

  // Applicants never need approval, so this page is not for them. A logged-out
  // visitor is sent to sign in; a candidate (or anyone with a real, non-member
  // role) is sent straight to their workspace. Only a genuine member-only /
  // no-role account actually waits here.
  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
    if (!rolesLoaded) return;
    const hasNonMemberRole = roles.some((r) => r.role !== 'member' && r.role !== 'pending');
    if (hasNonMemberRole) { navigate('/admin', { replace: true }); return; }
    // Safety net: if this "member-only" user has an application row, they are
    // actually a candidate whose role hasn't hydrated locally. Refresh and go.
    (async () => {
      const { data: app } = await supabase
        .from('applications').select('id').eq('user_id', user.id).maybeSingle();
      if (app) { await refreshProfile(); navigate('/admin', { replace: true }); return; }

      // Account redeem: if this login's (verified) email belongs to an
      // existing member profile, claim it now. The claim_member_account()
      // database function does all the work server-side: it links the
      // profile, applies the member's stored role and permissions, and never
      // creates a duplicate. It is safe to call repeatedly.
      if (claimTried.current) return;
      claimTried.current = true;
      try {
        const { data } = await supabase.rpc('claim_member_account');
        const status = (data as { status?: string } | null)?.status;
        if (status === 'linked' || status === 'already_linked') {
          setRedeem('linked');
          await refreshProfile(); // picks up the new role; the effect above then routes to the workspace
          return;
        }
        if (status === 'no_match') { setRedeem('no_match'); return; }
        if (status === 'email_in_use') { setRedeem('email_in_use'); return; }
        if (status === 'email_unconfirmed') { setRedeem('email_unconfirmed'); return; }
        setRedeem('waiting');
      } catch {
        setRedeem('waiting');
      }
    })();
  }, [user, roles, rolesLoaded, isLoading, navigate, refreshProfile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || '-';
  const displayEmail = user?.email || '-';

  const contactLink = (
    <a
      href="mailto:as.minerva@unibocconi.it"
      style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}
    >
      as.minerva@unibocconi.it
    </a>
  );

  const body = (() => {
    switch (redeem) {
      case 'checking':
        return <>One moment: we are checking whether this email address belongs to an existing member profile…</>;
      case 'linked':
        return <>Your existing member profile has been found and connected to this account. Loading your workspace…</>;
      case 'no_match':
        return <>
          This email address does not match any member profile in our register, so the account could not be
          connected automatically. If you are (or were) a member of the association, or you believe this is an
          error, please write to {contactLink} and we will connect your account manually.
        </>;
      case 'email_in_use':
        return <>
          The member profile registered with this email address is already connected to another account. If you
          think this is a mistake, please contact {contactLink}.
        </>;
      case 'email_unconfirmed':
        return <>
          Please confirm your email address first: open the verification email we sent you and click the link.
          As soon as the address is verified, your member profile is connected automatically. Questions? Contact {contactLink}.
        </>;
      default:
        return <>
          A committee member is reviewing your account. It's normal for this to take 2–3 days. Once approved,
          you'll be able to access the Minerva Workspace. If you have any questions, please contact {contactLink}.
        </>;
    }
  })();

  return (
    <AuthLayout
      title="Approval Pending"
      cardTitle="Approval Pending"
      cardSubtitle="Your account is awaiting approval."
    >
      <div
        className="font-body mb-5"
        style={{
          border: `1px solid ${AUTH_TOKENS.HAIRLINE}`,
          padding: '14px 16px',
          background: AUTH_TOKENS.GREY,
        }}
      >
        <div style={{ fontSize: '13px', color: AUTH_TOKENS.INK, marginBottom: '4px' }}>{displayName}</div>
        <div style={{ fontSize: '12.5px', color: AUTH_TOKENS.MUTED }}>{displayEmail}</div>
      </div>

      <p
        className="font-body mb-6"
        style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED, lineHeight: 1.6 }}
      >
        {body}
      </p>

      <AuthButton onClick={handleLogout}>Log Out</AuthButton>
    </AuthLayout>

  );
};

export default PendingApproval;
