import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton } from '@/components/shared/AuthUI';

const SessionExpired = () => {
  const navigate = useNavigate();
  return (
    <AuthLayout
      title="Your Session Has Expired"
      cardTitle="Your Session Has Expired"
      cardSubtitle="For your security, you've been signed out after a period of inactivity."
    >
      <AuthButton onClick={() => navigate('/auth')}>Log In Again</AuthButton>
      <div className="mt-3">
        <AuthButton onClick={() => navigate('/')}>
          Return To Homepage
        </AuthButton>
      </div>
    </AuthLayout>
  );
};

export default SessionExpired;
