import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton, AuthErrorBanner, AUTH_TOKENS } from '@/components/shared/AuthUI';

const PasswordResetSuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get('status');

  if (status === 'error') {
    return (
      <AuthLayout
        title="Something Went Wrong"
        cardTitle="Something Went Wrong"
        cardSubtitle="We couldn't update your password. The reset link may have expired. Request a new one and try again."
      >
        <AuthErrorBanner>The reset link is no longer valid.</AuthErrorBanner>
        <AuthButton onClick={() => navigate('/forgot-password')}>Request A New Link</AuthButton>
        <p className="font-body text-center mt-5" style={{ fontSize: '13.5px', color: AUTH_TOKENS.MUTED }}>
          <Link to="/auth" style={{ color: AUTH_TOKENS.NAVY, textDecoration: 'underline' }}>
            Back to sign-in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Password Updated"
      cardTitle="Password Updated"
      cardSubtitle="Your password has been changed successfully."
    >
      <AuthButton onClick={() => navigate('/auth')}>Continue To Sign-In</AuthButton>
    </AuthLayout>
  );
};

export default PasswordResetSuccess;
