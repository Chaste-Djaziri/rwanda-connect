import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { navItems, mobilePrimaryNav } from './navItems';
import { cn } from '@/lib/utils';

const policyLinks = [
  { label: 'Feedback', href: '#' },
  { label: 'Privacy', href: '#' },
  { label: 'Terms', href: '#' },
  { label: 'Help', href: '#' },
];

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const normalizeHandle = (value?: string | null) => value?.replace(/^@/, '').toLowerCase();
  const activeProfileHandle = location.pathname.startsWith('/profile/')
    ? normalizeHandle(location.pathname.split('/')[2])
    : null;
  const currentUserHandle = normalizeHandle(user?.handle);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur lg:hidden">
      <div className="mx-auto max-w-md px-4">
        <div className="flex items-center justify-between py-3">
          {mobilePrimaryNav.map((item) => {
            const isProfileItem = item.path === '/profile';
            const isActive = isProfileItem
              ? location.pathname === '/profile' ||
                (activeProfileHandle && currentUserHandle && activeProfileHandle === currentUserHandle)
              : location.pathname === item.path;
            const targetPath =
              item.path === '/profile' && user?.handle ? `/profile/${user.handle}` : item.path;
            return (
              <Link
                key={item.path}
                to={targetPath}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs font-semibold',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-6 w-6" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MobileMoreMenu() {
  const location = useLocation();
  const { user } = useAuth();
  const normalizeHandle = (value?: string | null) => value?.replace(/^@/, '').toLowerCase();
  const activeProfileHandle = location.pathname.startsWith('/profile/')
    ? normalizeHandle(location.pathname.split('/')[2])
    : null;
  const currentUserHandle = normalizeHandle(user?.handle);

  return (
    <div className="fixed left-4 top-4 z-50 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-muted">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName || user.handle}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  {user?.handle?.[0]?.toUpperCase() ?? 'H'}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.displayName || user?.handle || 'Hillside'}</p>
              {user?.handle && <p className="text-xs text-muted-foreground">@{user.handle}</p>}
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const isProfileItem = item.path === '/profile';
              const isActive = isProfileItem
                ? location.pathname === '/profile' ||
                  (activeProfileHandle && currentUserHandle && activeProfileHandle === currentUserHandle)
                : location.pathname === item.path;
              const targetPath =
                item.path === '/profile' && user?.handle ? `/profile/${user.handle}` : item.path;
              return (
                <Link
                  key={item.path}
                  to={targetPath}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {policyLinks.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-foreground">
                {link.label}
              </a>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
