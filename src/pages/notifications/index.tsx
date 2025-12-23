import { useEffect, useRef, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { atprotoClient } from '@/lib/atproto';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Heart, Repeat2, MessageSquare, UserPlus, AtSign, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { usePageMeta } from '@/lib/seo';
import { MobileMoreMenu } from '@/components/layout/BottomNav';

interface Notification {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    verified?: boolean;
  };
  reason: 'like' | 'repost' | 'follow' | 'mention' | 'reply' | 'quote';
  isRead: boolean;
  indexedAt: string;
  reasonSubject?: string;
}

const reasonIcons = {
  like: Heart,
  repost: Repeat2,
  follow: UserPlus,
  mention: AtSign,
  reply: MessageSquare,
  quote: MessageSquare,
};

const reasonLabels = {
  like: 'liked your post',
  repost: 'reposted your post',
  follow: 'followed you',
  mention: 'mentioned you',
  reply: 'replied to you',
  quote: 'quoted your post',
};

function NotificationItem({ notification }: { notification: Notification }) {
  const Icon = reasonIcons[notification.reason] || Bell;
  const label = reasonLabels[notification.reason] || 'interacted with you';

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  return (
    <article
      className={`p-4 border-b border-border hover:bg-muted/30 transition-colors ${
        !notification.isRead ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <Link to={`/profile/${notification.author.handle}`} className="shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                {notification.author.avatar ? (
                  <img
                    src={notification.author.avatar}
                    alt={notification.author.displayName || notification.author.handle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {notification.author.handle[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <Link
                  to={`/profile/${notification.author.handle}`}
                  className="font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                >
                  <span>{notification.author.displayName || notification.author.handle}</span>
                  <VerifiedBadge
                    className="w-3.5 h-3.5 text-primary"
                    handle={notification.author.handle}
                    verified={notification.author.verified}
                  />
                </Link>{' '}
                <span className="text-muted-foreground">{label}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {timeAgo(notification.indexedAt)}
              </p>
            </div>
            {!notification.isRead && (
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function NotificationSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  usePageMeta({
    title: 'Notifications',
    description: 'Mentions, likes, reposts, and replies from your network.',
  });
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await atprotoClient.getNotifications(refresh ? undefined : cursor);
      if (result.success && result.data) {
        const notifData: Notification[] = result.data.map((item: any) => ({
          uri: item.uri,
          cid: item.cid,
          author: {
            did: item.author.did,
            handle: item.author.handle,
            displayName: item.author.displayName,
            avatar: item.author.avatar,
            verified: item.author.verification?.verifiedStatus === 'valid',
          },
          reason: item.reason,
          isRead: item.isRead,
          indexedAt: item.indexedAt,
          reasonSubject: item.reasonSubject,
        }));

        if (refresh) {
          setNotifications(notifData);
          const latestSeenAt =
            notifData.reduce((latest, item) => {
              if (!latest) return item.indexedAt;
              return item.indexedAt > latest ? item.indexedAt : latest;
            }, '' as string) || new Date().toISOString();
          const seenResult = await atprotoClient.updateNotificationsSeen(latestSeenAt);
          if (seenResult.success) {
            setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
          }
        } else {
          setNotifications((prev) => [...prev, ...notifData]);
        }
        setCursor(result.cursor);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      setError('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [cursor]);

  useEffect(() => {
    let isActive = true;
    const init = async () => {
      setNotifications([]);
      setCursor(undefined);
      await atprotoClient.updateNotificationsSeen(new Date().toISOString());
      if (isActive) {
        fetchNotifications(true);
      }
    };
    init();
    return () => {
      isActive = false;
    };
  }, [user?.did]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !cursor) return;
    if (isLoading || isRefreshing) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNotifications(false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, isLoading, isRefreshing]);

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMoreMenu />
            <h1 className="font-semibold text-foreground text-lg">Notifications</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchNotifications(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="animate-fade-in">
        {error && (
          <div className="p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
            <Button variant="ghost" size="sm" onClick={() => fetchNotifications(true)} className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {isLoading && notifications.length === 0 ? (
          <div>
            {[...Array(8)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No notifications yet</h2>
            <p className="text-muted-foreground">
              When someone interacts with your posts, you'll see it here
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <NotificationItem key={notification.uri} notification={notification} />
            ))}

            {cursor && (
              <div className="p-4 flex justify-center">
                <Button variant="outline" onClick={() => fetchNotifications(false)} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}

            {cursor && <div ref={loadMoreRef} className="h-6" />}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
