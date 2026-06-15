import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton } from '@/components/shared/AuthUI';

const SessionExpired = () => {
  const navigate = useNavigate();
  return (
    <AuthLayout
      title="Your session has expired"
      cardTitle="Your session has expired"
      cardSubtitle="For your security, you've been signed out after a period of inactivity."
    >
      <AuthButton onClick={() => navigate('/auth')}>Log in again</AuthButton>
      <div className="mt-3">
        <AuthButton variant="grey" onClick={() => navigate('/')}>
          Return to homepage
        </AuthButton>
      </div>
    </AuthLayout>
  );
};

export default SessionExpired;
