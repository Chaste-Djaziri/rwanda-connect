import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageMeta } from '@/lib/seo';

export default function ProfileRedirect() {
  const { user } = useAuth();
  usePageMeta({
    title: 'Profile',
    description: 'Your profile on HillSide.',
  });
  if (!user?.handle) {
    return <Navigate to="/auth" replace />;
  }
  return <Navigate to={`/profile/${user.handle}`} replace />;
}
