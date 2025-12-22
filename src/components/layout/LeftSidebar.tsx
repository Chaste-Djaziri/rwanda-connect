import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { chatApi } from '@/lib/chat';
import { Home, Compass, Bell, User, Settings, MessageSquare, PenSquare, Hash, List, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const baseNavItems = [
  { icon: Home, label: 'Home', path: '/feed' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: Hash, label: 'Feeds', path: '/feeds' },
  { icon: List, label: 'Lists', path: '/lists' },
  { icon: Bookmark, label: 'Saved', path: '/saved' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function LeftSidebar() {
  const location = useLocation();
  const { user, hasChatSession, isChatSessionLoading, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!isAuthenticated || isChatSessionLoading || !hasChatSession) {
        setUnreadCount(0);
        return;
      }

      try {
        let total = 0;
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
          const result = await chatApi.listConvos({ readState: 'unread', limit: 100, cursor });
          total += result.convos.reduce((sum, convo) => sum + (convo.unreadCount || 0), 0);
          cursor = result.cursor;
          hasMore = Boolean(cursor);
          if (!hasMore) break;
        }

        setUnreadCount(total);
      } catch {
        setUnreadCount(0);
      }
    };

    loadUnreadCount();
  }, [isAuthenticated, isChatSessionLoading, hasChatSession, location.pathname]);

  return (
    <aside className="fixed left-40 top-6 bottom-6 w-72 bg-transparent hidden lg:flex flex-col z-40 px-6">
      <div className="h-20 flex items-center justify-center">
        <Link to="/profile" className="group flex items-center justify-center">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted ring-2 ring-border group-hover:ring-primary/60 transition-colors">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.displayName || user.handle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {user?.handle?.[0]?.toUpperCase() ?? 'I'}
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <ul className="space-y-2">
          {baseNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200 ml-2',
                    'hover:bg-muted/60 hover:text-foreground',
                    isActive && 'bg-muted text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-5 h-5 shrink-0',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  />
                  <span className="text-base font-medium">{item.label}</span>
                  {item.path === '/chat' && unreadCount > 0 && (
                    <span className="ml-auto min-w-6 h-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 hidden md:inline-flex">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pb-8">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 font-semibold shadow-glow hover:bg-primary/90 transition-colors"
        >
          <PenSquare className="w-4 h-4" />
          New Post
        </button>
      </div>
    </aside>
  );
}
