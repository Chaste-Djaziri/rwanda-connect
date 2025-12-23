import { useEffect, useState, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { getSavedPosts, removeSavedPost, savePost, SavedPost } from '@/lib/savedPosts';
import { FeedPost, PostCard } from '@/components/feed/PostCard';

function PostSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        <Skeleton className="w-11 h-11 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-6 pt-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [savedUris, setSavedUris] = useState<Set<string>>(new Set());
  const [pinnedFeeds, setPinnedFeeds] = useState<
    Array<{ id: string; type: string; value: string; label: string; avatar?: string }>
  >([]);
  const [activeFeed, setActiveFeed] = useState<{ id: string; type: string; value: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollTabs = pinnedFeeds.length > 4;

  useEffect(() => {
    const saved = getSavedPosts().map((post) => post.uri);
    setSavedUris(new Set(saved));
  }, []);

  const toggleSave = useCallback((post: FeedPost) => {
    setSavedUris((prev) => {
      const next = new Set(prev);
      if (next.has(post.uri)) {
        next.delete(post.uri);
        removeSavedPost(post.uri);
      } else {
        savePost(post as SavedPost);
        next.add(post.uri);
      }
      return next;
    });
  }, []);

  const fetchPinnedFeeds = useCallback(async () => {
    try {
      const prefsResult = await atprotoClient.getPreferences();
      const prefs = prefsResult.success && prefsResult.data ? prefsResult.data : [];
      const savedPref = prefs.find(
        (pref: any) =>
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPrefV2' ||
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPref'
      );
      const items: Array<{ id: string; type: string; value: string; pinned: boolean }> =
        savedPref?.items || [];
      const pinned = items.filter((item) => item.pinned);

      const feedUris = pinned.filter((item) => item.type === 'feed').map((item) => item.value);
      const feedMap = new Map<string, { label: string; avatar?: string }>();
      if (feedUris.length > 0) {
        const details = await atprotoClient.getFeedGenerators(feedUris);
        if (details.success && details.data) {
          details.data.forEach((feed: any) => {
            feedMap.set(feed.uri, {
              label: feed.displayName || 'Feed',
              avatar: feed.avatar,
            });
          });
        }
      }

      const mapped = pinned.map((item) => {
        if (item.type === 'feed') {
          const meta = feedMap.get(item.value);
          return {
            id: item.id,
            type: item.type,
            value: item.value,
            label: meta?.label || 'Feed',
            avatar: meta?.avatar,
          };
        }
        if (item.type === 'timeline') {
          const label =
            item.value === 'following'
              ? 'Following'
              : item.value === 'home'
                ? 'Home'
                : item.value;
          return { id: item.id, type: item.type, value: item.value, label };
        }
        return { id: item.id, type: item.type, value: item.value, label: 'Feed' };
      });

      setPinnedFeeds(mapped);
      if (mapped.length > 0) {
        const stillExists = activeFeed && mapped.some((item) => item.id === activeFeed.id);
        if (!stillExists) {
          setActiveFeed({ id: mapped[0].id, type: mapped[0].type, value: mapped[0].value });
        }
      } else {
        setActiveFeed({ id: 'timeline:following', type: 'timeline', value: 'following' });
      }
    } catch {
      setPinnedFeeds([]);
      setActiveFeed({ id: 'timeline:following', type: 'timeline', value: 'following' });
    }
  }, [activeFeed]);

  const fetchFeed = useCallback(
    async (refresh = false) => {
      if (!activeFeed) return;
      if (refresh) {
        setIsRefreshing(true);
      } else if (posts.length > 0) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result =
          activeFeed.type === 'timeline'
            ? await atprotoClient.getTimeline(refresh ? undefined : cursor, 30)
            : activeFeed.type === 'feed'
              ? await atprotoClient.getFeed(activeFeed.value, refresh ? undefined : cursor, 30)
              : { success: false };
        if (result.success && result.data) {
          const feedPosts: FeedPost[] = result.data.map((item: any) => ({
            uri: item.post.uri,
            cid: item.post.cid,
            author: {
              did: item.post.author.did,
              handle: item.post.author.handle,
              displayName: item.post.author.displayName,
              avatar: item.post.author.avatar,
              verified: item.post.author.verification?.verifiedStatus === 'valid',
            },
            record: {
              text: item.post.record.text,
              createdAt: item.post.record.createdAt,
            },
            replyCount: item.post.replyCount ?? 0,
            repostCount: item.post.repostCount ?? 0,
            likeCount: item.post.likeCount ?? 0,
            embed: item.post.embed,
            viewer: {
              like: item.post.viewer?.like,
              repost: item.post.viewer?.repost,
            },
          }));

          if (refresh) {
            setPosts(feedPosts);
          } else {
            setPosts((prev) => [...prev, ...feedPosts]);
          }
          setCursor(result.cursor);
        } else {
          setError('Failed to load feed');
        }
      } catch (err) {
        setError('Failed to fetch timeline');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [cursor, activeFeed, posts.length]
  );

  useEffect(() => {
    fetchPinnedFeeds();
  }, [fetchPinnedFeeds]);

  useEffect(() => {
    if (!activeFeed) return;
    setCursor(undefined);
    setPosts([]);
    fetchFeed(true);
  }, [activeFeed]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !cursor) return;
    if (isLoading || isLoadingMore || isRefreshing) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchFeed(false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, isLoading, isLoadingMore, isRefreshing, fetchFeed]);

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 grid grid-cols-3 items-center">
          <div />
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" onClick={() => fetchFeed(true)} disabled={isRefreshing}>
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="px-6 border-t border-border/60">
          <div className={`flex py-2 ${shouldScrollTabs ? 'gap-2 overflow-x-auto' : ''}`}>
            {pinnedFeeds.length === 0 && (
              <button
                type="button"
                onClick={() => setActiveFeed({ id: 'timeline:following', type: 'timeline', value: 'following' })}
                className={`${
                  shouldScrollTabs ? 'shrink-0 px-4' : 'flex-1 basis-0 px-4'
                } py-2 text-sm font-semibold text-center border-b-2 transition-colors whitespace-nowrap ${
                  activeFeed?.type === 'timeline' && activeFeed?.value === 'following'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Following
              </button>
            )}
            {pinnedFeeds.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveFeed({ id: item.id, type: item.type, value: item.value })}
                className={`${
                  shouldScrollTabs ? 'shrink-0 px-4' : 'flex-1 basis-0 px-4'
                } py-2 text-sm font-semibold text-center border-b-2 transition-colors whitespace-nowrap ${
                  activeFeed?.id === item.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="animate-fade-in">
        {error && (
          <div className="p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
            <Button variant="ghost" size="sm" onClick={() => fetchFeed(true)} className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {isLoading ? (
          [...Array(4)].map((_, i) => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No posts to show.</div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard
                key={post.uri}
                post={post}
                isSaved={savedUris.has(post.uri)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        )}

        {cursor && !isLoading && (
          <div className="flex justify-center py-6">
            <Button variant="outline" onClick={() => fetchFeed(false)} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}

        {cursor && <div ref={loadMoreRef} className="h-6" />}
      </div>
    </AppLayout>
  );
}
