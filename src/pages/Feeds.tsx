import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, Settings, Star, Users, Search } from 'lucide-react';


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

function MyFeedRow({
  title,
  description,
  icon,
  isPinned,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  isPinned?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 px-4 py-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      {isPinned && (
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
          Pinned
        </span>
      )}
    </div>
  );
}

function FeedCard({
  feed,
  pinned,
  onPin,
  isPinning,
}: {
  feed: FeedGenerator;
  pinned?: boolean;
  onPin: (uri: string) => void;
  isPinning: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/70 px-4 py-3">
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
      <Button
        type="button"
        size="sm"
        className="shrink-0"
        variant={pinned ? 'secondary' : 'default'}
        onClick={() => onPin(feed.uri)}
        disabled={isPinning}
      >
        {pinned ? 'Pinned' : 'Pin Feed'}
      </Button>
    </div>
  );
}

export default function FeedsPage() {
  const [savedFeeds, setSavedFeeds] = useState<SavedFeedItem[]>([]);
  const [savedFeedDetails, setSavedFeedDetails] = useState<Record<string, FeedGenerator>>({});
  const [suggestedFeeds, setSuggestedFeeds] = useState<FeedGenerator[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPinning, setIsPinning] = useState<string | null>(null);

  const fetchFeeds = async () => {
    setIsLoading(true);
    try {
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

      const suggested = await atprotoClient.getSuggestedFeeds();
      if (suggested.success && suggested.data) {
        setSuggestedFeeds(
          suggested.data.map((feed: any) => ({
            uri: feed.uri,
            displayName: feed.displayName,
            description: feed.description,
            avatar: feed.avatar,
            likeCount: feed.likeCount,
            creator: { handle: feed.creator.handle },
          }))
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

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
    <AppLayout>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-foreground text-lg">Feeds</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
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
              title="Discover"
              description="Trending posts from across Bluesky"
              icon={<Compass className="h-4 w-4" />}
              isPinned
            />
            <MyFeedRow
              title="Following"
              description="Posts from people you follow"
              icon={<Users className="h-4 w-4" />}
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
                  isPinned={pinnedSet.has(feed.uri)}
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No saved feeds yet.</p>
            )}
          </div>
        </section>

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
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No feeds found.</p>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
