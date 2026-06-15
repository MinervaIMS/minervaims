import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton } from '@/components/shared/AuthUI';

const AccessDenied = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <AuthLayout
      title="Access Not Approved"
      cardTitle="Access Not Approved"
      cardSubtitle="Your request to join the Minerva Workspace wasn't approved at this time. You're welcome to re-apply in the next recruitment cycle."
    >
      <AuthButton onClick={handleLogout}>Log Out</AuthButton>
    </AuthLayout>
  );
};

export default AccessDenied;
