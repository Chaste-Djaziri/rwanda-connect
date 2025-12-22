import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Left Sidebar */}
      <LeftSidebar />

      {/* Main Content - Center Column */}
      <main className="min-h-screen border-x border-border lg:ml-[calc(18rem+3.5rem)] lg:mr-[calc(20rem+3.5rem)]">
        {children}
      </main>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}
