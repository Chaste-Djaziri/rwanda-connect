import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { chatApi } from '@/lib/chat';
import { atprotoClient } from '@/lib/atproto';
import { PenSquare, MoreHorizontal, User, UserPlus, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from './navItems';
import { NewPostDialog } from '@/components/composer/NewPostDialog';
import { VerifiedBadge } from '@/components/VerifiedBadge';
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
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

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
  }, [isAuthenticated, isChatSessionLoading, hasChatSession, location.pathname, user?.did]);

  useEffect(() => {
    const loadNotificationsCount = async () => {
      if (!isAuthenticated) {
        setNotifUnreadCount(0);
        return;
      }
      if (location.pathname.startsWith('/notifications')) {
        setNotifUnreadCount(0);
        return;
      }

      try {
        const result = await atprotoClient.getUnreadNotificationsCount();
        setNotifUnreadCount(result.success ? result.count : 0);
      } catch {
        setNotifUnreadCount(0);
      }
    };

    loadNotificationsCount();
  }, [isAuthenticated, location.pathname, user?.did]);

  const normalizeHandle = (value?: string | null) => value?.replace(/^@/, '').toLowerCase();
  const activeProfileHandle = location.pathname.startsWith('/profile/')
    ? normalizeHandle(location.pathname.split('/')[2])
    : null;
  const currentUserHandle = normalizeHandle(user?.handle);

  if (!isAuthenticated) {
    return (
      <aside
        className="fixed top-6 bottom-6 w-20 bg-transparent hidden lg:flex flex-col z-40 px-4 xl:w-72"
        style={{ left: leftOffset }}
      >
        <div className="h-20 flex items-center px-3 xl:px-5">
          <img
            src="/logo/dark-mode-logo.png"
            alt="HiiSide"
            className="h-auto w-auto max-h-10 max-w-10"
          />
        </div>
        <div className="mt-6 px-3 xl:px-5">
          <h2 className="text-lg font-semibold text-foreground">Join the conversation</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in or create an account to participate.
          </p>
        </div>
        <div className="mt-6 px-3 xl:px-5 flex flex-col gap-3">
          <a
            href="https://bsky.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-center text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Create account
          </a>
          <Link
            to="/auth"
            className="w-full rounded-full border border-border py-2.5 text-center text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </aside>
    );
  }

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
                  'flex items-center gap-3 rounded-[36px] border border-transparent bg-transparent px-0 py-0 transition-all duration-200',
                  'group-hover:border-border group-hover:bg-background/80 group-hover:px-4 group-hover:py-2 group-hover:shadow-md group-hover:min-w-[240px]',
                  'group-data-[state=open]:border-border group-data-[state=open]:bg-background/80 group-data-[state=open]:px-4 group-data-[state=open]:py-2 group-data-[state=open]:shadow-md group-data-[state=open]:min-w-[240px]'
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
                    <div className="flex items-center gap-1">
                      <p className="font-semibold truncate">{user?.displayName || user?.handle || 'Account'}</p>
                      <VerifiedBadge
                        className="w-4 h-4 text-primary"
                        handle={user?.handle}
                        verified={user?.verified}
                      />
                    </div>
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
              <User className="mr-2 h-4 w-4" />
              Go to profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/auth?add=1')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add another account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
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
                  {item.path === '/notifications' && notifUnreadCount > 0 && (
                    <>
                      <span className="ml-auto min-w-6 h-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 hidden xl:inline-flex">
                        {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
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
