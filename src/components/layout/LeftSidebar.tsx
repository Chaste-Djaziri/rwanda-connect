import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { chatApi } from '@/lib/chat';
import { PenSquare, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from './navItems';
import { NewPostDialog } from '@/components/composer/NewPostDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LeftSidebar() {
  const leftOffset = 'calc(50% - 17.5vw - 18rem - 3rem)';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasChatSession, isChatSessionLoading, isAuthenticated, logout } = useAuth();
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

  const normalizeHandle = (value?: string | null) => value?.replace(/^@/, '').toLowerCase();
  const activeProfileHandle = location.pathname.startsWith('/profile/')
    ? normalizeHandle(location.pathname.split('/')[2])
    : null;
  const currentUserHandle = normalizeHandle(user?.handle);

  return (
    <aside
      className="fixed top-6 bottom-6 w-20 bg-transparent hidden lg:flex flex-col z-40 px-4 xl:w-72"
      style={{ left: leftOffset }}
    >
      <div className="h-20 flex items-center px-3 xl:px-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group relative w-full rounded-2xl focus:outline-none"
              aria-label="Account options"
            >
              <div
                className={cn(
                  'flex items-center gap-3 rounded-[32px] border border-transparent bg-transparent px-0 py-0 transition-all duration-200',
                  'group-hover:border-border group-hover:bg-background/80 group-hover:px-3 group-hover:py-2 group-hover:shadow-md',
                  'group-data-[state=open]:border-border group-data-[state=open]:bg-background/80 group-data-[state=open]:px-3 group-data-[state=open]:py-2 group-data-[state=open]:shadow-md'
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted ring-2 ring-border transition-all duration-200 group-hover:scale-75 group-hover:-translate-x-2 group-hover:ring-primary/60 group-data-[state=open]:scale-75 group-data-[state=open]:-translate-x-2 group-data-[state=open]:ring-primary/60">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName || user.handle}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                      {user?.handle?.[0]?.toUpperCase() ?? 'I'}
                    </div>
                  )}
                </div>
                <div className="hidden xl:flex min-w-0 flex-1 items-center gap-3 opacity-0 transition-all duration-200 group-hover:opacity-100 group-data-[state=open]:opacity-100">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{user?.displayName || user?.handle || 'Account'}</p>
                    {user?.handle && <p className="text-xs text-muted-foreground truncate">@{user.handle}</p>}
                  </div>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground group-hover:bg-muted group-data-[state=open]:text-foreground group-data-[state=open]:bg-muted">
                    <MoreHorizontal className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(user?.handle ? `/profile/${user.handle}` : '/profile')}>
              Go to profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.alert('Add account coming soon')}>
              Add another account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isProfileItem = item.path === '/profile';
            const isActive = isProfileItem
              ? location.pathname === '/profile' ||
                (activeProfileHandle && currentUserHandle && activeProfileHandle === currentUserHandle)
              : location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-full transition-all duration-200 xl:ml-2',
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
                  <span className="text-base font-medium hidden xl:block">{item.label}</span>
                  {item.path === '/chat' && unreadCount > 0 && (
                    <>
                      <span className="ml-auto min-w-6 h-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 hidden xl:inline-flex">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                      <span className="ml-auto h-2 w-2 rounded-full bg-primary xl:hidden" />
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pb-8 flex items-center justify-center xl:justify-start">
        <NewPostDialog
          trigger={
            <button
              type="button"
              className="w-12 h-12 xl:w-full xl:h-auto flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition-colors"
            >
              <PenSquare className="w-4 h-4" />
              <span className="hidden xl:block">New Post</span>
            </button>
          }
        />
      </div>
    </aside>
  );
}
