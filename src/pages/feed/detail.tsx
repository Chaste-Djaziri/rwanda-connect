import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { FeedPost, PostCard } from '@/components/feed/PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSavedPosts, removeSavedPost, savePost, SavedPost } from '@/lib/savedPosts';
import { usePageMeta } from '@/lib/seo';

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

export default function FeedDetailPage() {
  const { handle, feedId } = useParams<{ handle: string; feedId: string }>();
  const [feedMeta, setFeedMeta] = useState<{ name: string; description?: string } | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [savedUris, setSavedUris] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  usePageMeta({
    title: feedMeta?.name || 'Feed',
    description: feedMeta?.description || 'Explore a curated feed on HiiSide.',
  });

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

  const feedUri = useMemo(() => {
    if (!handle || !feedId) return null;
    return { handle, feedId };
  }, [handle, feedId]);

  const fetchFeed = useCallback(
    async (refresh = false) => {
      if (!feedUri) return;
      if (refresh) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const resolved = await atprotoClient.resolveHandle(feedUri.handle);
        if (!resolved.success || !resolved.data?.did) {
          setError('Failed to resolve feed owner.');
          return;
        }
        const uri = `at://${resolved.data.did}/app.bsky.feed.generator/${feedUri.feedId}`;
        const [metaResult, feedResult] = await Promise.all([
          atprotoClient.getFeedGenerators([uri]),
          atprotoClient.getFeed(uri, refresh ? undefined : cursor, 30),
        ]);

        if (metaResult.success && metaResult.data?.[0]) {
          setFeedMeta({
            name: metaResult.data[0].displayName,
            description: metaResult.data[0].description,
          });
        }

        if (feedResult.success && feedResult.data) {
          const mapped: FeedPost[] = feedResult.data.map((item: any) => ({
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
          setPosts((prev) => (refresh ? mapped : [...prev, ...mapped]));
          setCursor(feedResult.cursor);
        }
      } catch (err) {
        setError('Failed to load feed.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [feedUri, cursor]
  );

  useEffect(() => {
    setPosts([]);
    setCursor(undefined);
    if (feedUri) {
      fetchFeed(true);
    }
  }, [feedUri]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !cursor) return;
    if (isLoading || isLoadingMore) return;

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
  }, [cursor, isLoading, isLoadingMore, fetchFeed]);

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-foreground text-lg">{feedMeta?.name || 'Feed'}</h1>
            {feedMeta?.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{feedMeta.description}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchFeed(true)}>
            Refresh
          </Button>
        </div>
      </header>

      <div className="animate-fade-in">
        {error && (
          <div className="p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          [...Array(4)].map((_, i) => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No posts in this feed.</div>
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

        {isLoadingMore && (
          <div className="flex justify-center py-6 text-sm text-muted-foreground">Loading more…</div>
        )}

        {cursor && !isLoading && (
          <div className="flex justify-center py-6">
            <Button variant="outline" onClick={() => fetchFeed(false)} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}

        {!cursor && !isLoading && posts.length > 0 && (
          <div className="flex justify-center py-6 text-xs text-muted-foreground">No more posts.</div>
        )}

        {cursor && <div ref={loadMoreRef} className="h-6" />}
      </div>
    </AppLayout>
  );
}
