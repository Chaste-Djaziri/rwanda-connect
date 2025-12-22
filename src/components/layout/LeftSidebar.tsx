import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Compass, Bell, User, Settings, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/feed' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function LeftSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 xl:w-64 border-r border-border bg-background flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 xl:px-6">
        <Link to="/feed" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="hidden xl:block font-bold text-xl text-foreground">Imvura</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200',
                    'hover:bg-muted/50',
                    isActive && 'bg-primary/10 text-primary font-semibold'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-6 h-6 shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'hidden xl:block text-base',
                      isActive ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="hidden xl:block ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      {user && (
        <div className="p-3 border-t border-border">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName || user.handle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  {user.handle[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="hidden xl:block min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">
                {user.displayName || user.handle}
              </p>
              <p className="text-xs text-muted-foreground truncate">@{user.handle}</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
