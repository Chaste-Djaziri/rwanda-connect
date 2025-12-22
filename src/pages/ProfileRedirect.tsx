import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileRedirect() {
  const { user } = useAuth();
  if (!user?.handle) {
    return <Navigate to="/auth" replace />;
  }
  return <Navigate to={`/profile/${user.handle}`} replace />;
}
