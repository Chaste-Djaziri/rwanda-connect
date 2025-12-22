import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home, MessageSquare, Heart, Repeat2 } from 'lucide-react';

interface FeedPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
  };
  replyCount: number;
  repostCount: number;
  likeCount: number;
}

function PostCard({ post }: { post: FeedPost }) {
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
    <article className="p-4 border-b border-border hover:bg-muted/30 transition-colors duration-200">
      <div className="flex gap-3">
        {/* Avatar */}
        <Link 
          to={`/profile`}
          className="shrink-0"
        >
          <div className="w-11 h-11 rounded-full overflow-hidden bg-muted">
            {post.author.avatar ? (
              <img 
                src={post.author.avatar} 
                alt={post.author.displayName || post.author.handle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {post.author.handle[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-foreground truncate">
              {post.author.displayName || post.author.handle}
            </span>
            <span className="text-muted-foreground text-sm truncate">
              @{post.author.handle}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <time className="text-muted-foreground text-sm shrink-0">
              {timeAgo(post.record.createdAt)}
            </time>
          </div>

          {/* Post text */}
          <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed mb-3">
            {post.record.text}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-6 -ml-2">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">{post.replyCount || ''}</span>
            </button>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-success transition-colors p-2 rounded-full hover:bg-success/10">
              <Repeat2 className="w-4 h-4" />
              <span className="text-sm">{post.repostCount || ''}</span>
            </button>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full hover:bg-destructive/10">
              <Heart className="w-4 h-4" />
              <span className="text-sm">{post.likeCount || ''}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();

  const fetchFeed = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await atprotoClient.getTimeline(refresh ? undefined : cursor);
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
  }, [cursor]);

  useEffect(() => {
    fetchFeed(true);
  }, []);

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-4 h-14 flex items-center justify-between">
          <h1 className="font-semibold text-foreground text-lg">Home</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchFeed(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Feed */}
      <div className="animate-fade-in">
        {error && (
          <div className="p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fetchFeed(true)}
              className="ml-2"
            >
              Retry
            </Button>
          </div>
        )}

        {isLoading && posts.length === 0 ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Your feed is empty</h2>
            <p className="text-muted-foreground">
              Follow some accounts to see posts here
            </p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard key={post.uri} post={post} />
            ))}
            
            {cursor && (
              <div className="p-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchFeed(false)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
