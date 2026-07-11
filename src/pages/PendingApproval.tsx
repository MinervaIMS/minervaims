import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton, AUTH_TOKENS } from '@/components/shared/AuthUI';

const PendingApproval = () => {
  const { user, profile, roles, rolesLoaded, signOut, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

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
      if (app) { await refreshProfile(); navigate('/admin', { replace: true }); }
    })();
  }, [user, roles, rolesLoaded, isLoading, navigate, refreshProfile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || '—';
  const displayEmail = user?.email || '—';

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
        A committee member is reviewing your application. It's normal for this to take 2–3 days. Once
        approved, you'll be able to access the Minerva Workspace. If you have any questions, please{' '}
        <a
          href="mailto:as.minerva@unibocconi.it"
          style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}
        >
          contact us
        </a>
        .
      </p>

      <AuthButton onClick={handleLogout}>Log Out</AuthButton>
    </AuthLayout>

  );
};

export default PendingApproval;
