import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { getSavedPosts, removeSavedPost, SavedPost } from '@/lib/savedPosts';

function SavedPostCard({ post, onRemove }: { post: SavedPost; onRemove: (uri: string) => void }) {
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
        <Link to={`/profile/${post.author.handle}`} className="shrink-0">
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
        <div className="flex-1 min-w-0">
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
          <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed mb-3">
            {post.record.text}
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onRemove(post.uri)}
              className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              <Bookmark className="w-4 h-4" fill="currentColor" />
              Saved
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SavedPage() {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);

  useEffect(() => {
    setSavedPosts(getSavedPosts());
  }, []);

  const handleRemove = (uri: string) => {
    removeSavedPost(uri);
    setSavedPosts(getSavedPosts());
  };

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-foreground text-lg">Saved</h1>
            <p className="text-xs text-muted-foreground">Posts you bookmarked</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSavedPosts(getSavedPosts())}>
            Refresh
          </Button>
        </div>
      </header>

      <div className="animate-fade-in">
        {savedPosts.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <p className="text-sm">No saved posts yet.</p>
            <p className="text-xs mt-2">Bookmark posts to find them here.</p>
          </div>
        ) : (
          <div>
            {savedPosts.map((post) => (
              <SavedPostCard key={post.uri} post={post} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
