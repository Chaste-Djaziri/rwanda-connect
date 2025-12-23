import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSavedPosts, removeSavedPost, savePost, SavedPost } from '@/lib/savedPosts';
import { FeedPost, PostCard } from '@/components/feed/PostCard';
import { usePageMeta } from '@/lib/seo';

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  usePageMeta({
    title: tag ? `#${tag}` : 'Hashtag',
    description: tag ? `Posts tagged #${tag} on HiiSide.` : 'Hashtag posts on HiiSide.',
  });
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [savedUris, setSavedUris] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  const fetchPosts = useCallback(
    async (refresh = false) => {
      if (!tag) return;
      if (refresh) {
        setIsLoading(true);
      } else if (posts.length > 0) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await atprotoClient.searchPostsByTag(tag, refresh ? undefined : cursor, 30);
        if (result.success && result.data) {
          const mapped: FeedPost[] = result.data.map((post: any) => ({
            uri: post.uri,
            cid: post.cid,
            author: {
              did: post.author.did,
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatar: post.author.avatar,
              verified: post.author.verification?.verifiedStatus === 'valid',
            },
            record: {
              text: post.record.text,
              createdAt: post.record.createdAt,
            },
            replyCount: post.replyCount ?? 0,
            repostCount: post.repostCount ?? 0,
            likeCount: post.likeCount ?? 0,
            embed: post.embed,
            viewer: {
              like: post.viewer?.like,
              repost: post.viewer?.repost,
            },
          }));

          if (refresh) {
            setPosts(mapped);
          } else {
            setPosts((prev) => [...prev, ...mapped]);
          }
          setCursor(result.cursor);
        } else {
          setError('Failed to load hashtag feed');
        }
      } catch (err) {
        setError('Failed to fetch hashtag feed');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [tag, cursor, posts.length]
  );

  useEffect(() => {
    setCursor(undefined);
    setPosts([]);
    fetchPosts(true);
  }, [tag]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !cursor) return;
    if (isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchPosts(false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, isLoading, isLoadingMore, fetchPosts]);

  return (
    <AppLayout requireAuth={false}>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 flex items-center">
          <h1 className="font-semibold text-foreground text-lg">#{tag}</h1>
        </div>
      </header>

      <div className="animate-fade-in">
        {error && (
          <div className="p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
            <Button variant="ghost" size="sm" onClick={() => fetchPosts(true)} className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="p-4 border-b border-border">
              <div className="flex gap-3">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No posts with this tag yet.</div>
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
            <Button variant="outline" onClick={() => fetchPosts(false)} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}

        {cursor && <div ref={loadMoreRef} className="h-6" />}
      </div>
    </AppLayout>
  );
}
