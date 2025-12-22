import { useEffect, useState, useCallback } from 'react';
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
  const discoverFeedUri =
    'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [savedUris, setSavedUris] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();

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

  const fetchFeed = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result =
          activeTab === 'discover'
            ? await atprotoClient.getFeed(discoverFeedUri, refresh ? undefined : cursor, 30)
            : await atprotoClient.getTimeline(refresh ? undefined : cursor, 30);
        if (result.success && result.data) {
          const feedPosts: FeedPost[] = result.data.map((item: any) => ({
            uri: item.post.uri,
            cid: item.post.cid,
            author: {
              did: item.post.author.did,
              handle: item.post.author.handle,
              displayName: item.post.author.displayName,
              avatar: item.post.author.avatar,
            },
            record: {
              text: item.post.record.text,
              createdAt: item.post.record.createdAt,
            },
            replyCount: item.post.replyCount ?? 0,
            repostCount: item.post.repostCount ?? 0,
            likeCount: item.post.likeCount ?? 0,
            embed: item.post.embed,
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
        setIsRefreshing(false);
      }
    },
    [cursor]
  );

  useEffect(() => {
    setCursor(undefined);
    setPosts([]);
    fetchFeed(true);
  }, [activeTab]);

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
          <div className="grid grid-cols-2 text-sm font-semibold">
            {(['discover', 'following'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 border-b-2 transition-colors text-center ${
                  activeTab === tab
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'discover' ? 'Discover' : 'Following'}
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
            <Button variant="outline" onClick={() => fetchFeed(false)}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
