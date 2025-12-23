import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, Settings, Star, Users, Search, ChevronRight, Pin } from 'lucide-react';
import { usePageMeta } from '@/lib/seo';
import { useAuth } from '@/contexts/AuthContext';
import { MobileMoreMenu } from '@/components/layout/BottomNav';


type SavedFeedItem = {
  id: string;
  type: 'feed' | 'list' | 'timeline';
  value: string;
  pinned: boolean;
};

type FeedGenerator = {
  uri: string;
  displayName: string;
  description?: string;
  avatar?: string;
  likeCount?: number;
  creator: {
    handle: string;
  };
};

function getFeedRoute(feed: FeedGenerator) {
  const feedId = feed.uri.split('/').pop();
  if (!feedId) return '#';
  return `/profile/${feed.creator.handle}/feed/${feedId}`;
}

function MyFeedRow({
  title,
  description,
  icon,
  to,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-border/70 px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function FeedCard({
  feed,
  pinned,
  onPin,
  isPinning,
  showPin,
}: {
  feed: FeedGenerator;
  pinned?: boolean;
  onPin: (uri: string) => void;
  isPinning: boolean;
  showPin: boolean;
}) {
  return (
    <Link
      to={getFeedRoute(feed)}
      className="flex items-start gap-3 rounded-lg border border-border/70 px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
        {feed.avatar ? (
          <img src={feed.avatar} alt={feed.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-primary bg-primary/10">
            <Star className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{feed.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">Feed by @{feed.creator.handle}</p>
        {feed.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{feed.description}</p>
        )}
        {typeof feed.likeCount === 'number' && (
          <p className="text-xs text-muted-foreground mt-2">
            Liked by {feed.likeCount.toLocaleString()} users
          </p>
        )}
      </div>
      {showPin && (
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          variant={pinned ? 'secondary' : 'default'}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPin(feed.uri);
          }}
          disabled={isPinning}
        >
          <Pin className="mr-2 h-3.5 w-3.5" />
          {pinned ? 'Pinned' : 'Pin Feed'}
        </Button>
      )}
    </Link>
  );
}

export default function FeedsPage() {
  const { isAuthenticated } = useAuth();
  usePageMeta({
    title: 'Feeds',
    description: 'Browse and manage your pinned feeds on HillSide.',
  });
  const [savedFeeds, setSavedFeeds] = useState<SavedFeedItem[]>([]);
  const [savedFeedDetails, setSavedFeedDetails] = useState<Record<string, FeedGenerator>>({});
  const [suggestedFeeds, setSuggestedFeeds] = useState<FeedGenerator[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPinning, setIsPinning] = useState<string | null>(null);
  const [suggestedCursor, setSuggestedCursor] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchFeeds = async (refreshSuggested = true) => {
    if (refreshSuggested) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      if (!isAuthenticated) {
        const suggested = await atprotoClient.getSuggestedFeedsPublic(
          refreshSuggested ? undefined : suggestedCursor,
          20
        );
        if (suggested.success && suggested.data) {
          const mapped = suggested.data.map((feed: any) => ({
            uri: feed.uri,
            displayName: feed.displayName,
            description: feed.description,
            avatar: feed.avatar,
            likeCount: feed.likeCount,
            creator: { handle: feed.creator.handle },
          }));
          setSuggestedFeeds((prev) => (refreshSuggested ? mapped : [...prev, ...mapped]));
          setSuggestedCursor(suggested.cursor);
        }
        setSavedFeeds([]);
        setSavedFeedDetails({});
        return;
      }
      const prefsResult = await atprotoClient.getPreferences();
      const prefs = prefsResult.success && prefsResult.data ? prefsResult.data : [];
      const savedPref = prefs.find(
        (pref: any) =>
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPrefV2' ||
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPref'
      );
      const items: SavedFeedItem[] = (savedPref?.items || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        value: item.value,
        pinned: Boolean(item.pinned),
      }));
      setSavedFeeds(items);

      const feedUris = items.filter((item) => item.type === 'feed').map((item) => item.value);
      if (feedUris.length > 0) {
        const details = await atprotoClient.getFeedGenerators(feedUris);
        if (details.success && details.data) {
          const map: Record<string, FeedGenerator> = {};
          details.data.forEach((feed: any) => {
            map[feed.uri] = {
              uri: feed.uri,
              displayName: feed.displayName,
              description: feed.description,
              avatar: feed.avatar,
              likeCount: feed.likeCount,
              creator: { handle: feed.creator.handle },
            };
          });
          setSavedFeedDetails(map);
        }
      }

      const suggested = await atprotoClient.getSuggestedFeeds(refreshSuggested ? undefined : suggestedCursor, 20);
      if (suggested.success && suggested.data) {
        const mapped = suggested.data.map((feed: any) => ({
          uri: feed.uri,
          displayName: feed.displayName,
          description: feed.description,
          avatar: feed.avatar,
          likeCount: feed.likeCount,
          creator: { handle: feed.creator.handle },
        }));
        setSuggestedFeeds((prev) => (refreshSuggested ? mapped : [...prev, ...mapped]));
        setSuggestedCursor(suggested.cursor);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeeds(true);
  }, [isAuthenticated]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !suggestedCursor) return;
    if (isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchFeeds(false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [suggestedCursor, isLoading, isLoadingMore]);

  const pinnedSet = useMemo(
    () => new Set(savedFeeds.filter((item) => item.pinned).map((item) => item.value)),
    [savedFeeds]
  );

  const filteredSuggested = useMemo(() => {
    if (!search.trim()) return suggestedFeeds;
    const term = search.toLowerCase();
    return suggestedFeeds.filter(
      (feed) =>
        feed.displayName.toLowerCase().includes(term) ||
        feed.description?.toLowerCase().includes(term) ||
        feed.creator.handle.toLowerCase().includes(term)
    );
  }, [suggestedFeeds, search]);

  const handlePin = async (uri: string) => {
    if (isPinning) return;
    setIsPinning(uri);
    const result = await atprotoClient.pinFeed(uri, 'feed');
    if (result.success) {
      await fetchFeeds();
    }
    setIsPinning(null);
  };

  const myFeeds = savedFeeds
    .filter((item) => item.type === 'feed')
    .map((item) => savedFeedDetails[item.value])
    .filter(Boolean);

  return (
    <AppLayout requireAuth={false}>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMoreMenu />
            <h1 className="font-semibold text-foreground text-lg">Feeds</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        {isAuthenticated && (
          <section className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">My Feeds</h2>
              <p className="text-sm text-muted-foreground">
                All the feeds you&apos;ve saved, right in one place.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <MyFeedRow
              title="Following"
              description="Posts from people you follow"
              icon={<Users className="h-4 w-4" />}
              to="/feed"
            />

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={`feed-skeleton-${i}`} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : myFeeds.length > 0 ? (
              myFeeds.map((feed) => (
                <MyFeedRow
                  key={feed.uri}
                  title={feed.displayName}
                  description={`Feed by @${feed.creator.handle}`}
                  icon={<Star className="h-4 w-4" />}
                  to={getFeedRoute(feed)}
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No saved feeds yet.</p>
            )}
          </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Discover New Feeds</h2>
              <p className="text-sm text-muted-foreground">
                Choose your own timeline. Feeds built by the community help you find content you love.
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search feeds"
              className="pl-9"
            />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={`suggested-${i}`} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredSuggested.length > 0 ? (
              filteredSuggested.map((feed) => (
                <FeedCard
                  key={feed.uri}
                  feed={feed}
                  pinned={pinnedSet.has(feed.uri)}
                  onPin={handlePin}
                  isPinning={isPinning === feed.uri}
                  showPin={isAuthenticated}
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No feeds found.</p>
            )}

            {suggestedCursor && <div ref={loadMoreRef} className="h-6" />}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
