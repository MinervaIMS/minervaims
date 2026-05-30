import { Navigate } from 'react-router-dom';

// People index redirects to /people/members
const MembersIndex = () => {
  return <Navigate to="/people/members" replace />;
};

export default MembersIndex;
