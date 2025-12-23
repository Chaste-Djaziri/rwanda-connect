import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AppLayout({ children, requireAuth = true }: AppLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Left Sidebar */}
      <LeftSidebar />

      {/* Main Content - Center Column */}
      <main className="min-h-screen border-x border-border pb-16 lg:pb-0 mx-auto w-full lg:max-w-2xl xl:w-[35vw] xl:max-w-[35vw]">
        {children}
      </main>

      {/* Right Sidebar */}
      <RightSidebar />

      {/* Mobile Bottom Nav */}
      {isAuthenticated && <BottomNav />}
    </div>
  );
}
