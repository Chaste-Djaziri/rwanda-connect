import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Heart, Repeat2, Bookmark } from 'lucide-react';
import { getSavedPosts, removeSavedPost, savePost, SavedPost } from '@/lib/savedPosts';

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
  embed?: any;
}

const renderExternalEmbed = (embed: any) => {
  const external = embed?.external;
  if (!external) return null;
  return (
    <a
      href={external.uri}
      target="_blank"
      rel="noreferrer"
      className="mt-3 block overflow-hidden rounded-xl border border-border hover:bg-muted/20 transition-colors"
    >
      {external.thumb && (
        <img src={external.thumb} alt={external.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-3">
        <p className="text-sm font-semibold text-foreground">{external.title}</p>
        {external.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{external.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2 truncate">{external.uri}</p>
      </div>
    </a>
  );
};

const renderImagesEmbed = (embed: any) => {
  const images = embed?.images;
  if (!Array.isArray(images)) return null;
  return (
    <div className="mt-3 grid gap-2 rounded-xl overflow-hidden border border-border">
      {images.map((image: any, index: number) => (
        <img
          key={`${image?.thumb ?? 'image'}-${index}`}
          src={image.thumb || image.fullsize}
          alt={image.alt || 'Post image'}
          className="w-full max-h-96 object-cover"
        />
      ))}
    </div>
  );
};

const renderVideoEmbed = (embed: any) => {
  const video = embed;
  if (!video?.playlist && !video?.thumb) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      {video.playlist ? (
        <video controls poster={video.thumb} className="w-full max-h-96 bg-black">
          <source src={video.playlist} />
        </video>
      ) : (
        <img src={video.thumb} alt="Video thumbnail" className="w-full max-h-96 object-cover" />
      )}
    </div>
  );
};

const renderRecordEmbed = (embed: any) => {
  const record = embed?.record;
  if (!record) return null;
  const author = record.author;
  const text = record.value?.text;
  return (
    <div className="mt-3 rounded-xl border border-border p-3 bg-muted/20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          {author?.displayName || author?.handle || 'Post'}
        </span>
        {author?.handle && <span>@{author.handle}</span>}
      </div>
      {text && <p className="text-sm text-foreground mt-2 line-clamp-3">{text}</p>}
    </div>
  );
};

const renderEmbed = (embed?: any) => {
  if (!embed) return null;
  const type = embed.$type || '';

  if (type.includes('app.bsky.embed.images')) {
    return renderImagesEmbed(embed);
  }
  if (type.includes('app.bsky.embed.external')) {
    return renderExternalEmbed(embed);
  }
  if (type.includes('app.bsky.embed.video')) {
    return renderVideoEmbed(embed);
  }
  if (type.includes('app.bsky.embed.recordWithMedia')) {
    return (
      <>
        {renderEmbed(embed.media)}
        {renderRecordEmbed(embed.record)}
      </>
    );
  }
  if (type.includes('app.bsky.embed.record')) {
    return renderRecordEmbed(embed);
  }

  return null;
};

function PostCard({
  post,
  isSaved,
  onToggleSave,
}: {
  post: FeedPost;
  isSaved: boolean;
  onToggleSave: (post: FeedPost) => void;
}) {
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
        <Link to={`/profile`} className="shrink-0">
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
            <span className="text-muted-foreground text-sm truncate">@{post.author.handle}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <time className="text-muted-foreground text-sm shrink-0">
              {timeAgo(post.record.createdAt)}
            </time>
          </div>

          {/* Post text */}
          <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed mb-3">
            {post.record.text}
          </p>
          {renderEmbed(post.embed)}

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
            <button
              type="button"
              onClick={() => onToggleSave(post)}
              className={`flex items-center gap-2 p-2 rounded-full transition-colors ${
                isSaved
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
              <span className="text-sm">{isSaved ? 'Saved' : ''}</span>
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
          <div className="flex gap-6">
            {(['discover', 'following'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
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
