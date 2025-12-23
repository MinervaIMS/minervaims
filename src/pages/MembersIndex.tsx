import { Navigate } from 'react-router-dom';

// Members index redirects to /members/team
const MembersIndex = () => {
  return <Navigate to="/members/team" replace />;
};

export default MembersIndex;
