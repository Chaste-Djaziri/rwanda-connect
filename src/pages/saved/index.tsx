import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { getSavedPosts, removeSavedPost, SavedPost } from '@/lib/savedPosts';
import { FeedPost, PostCard } from '@/components/feed/PostCard';

export default function SavedPage() {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);

  useEffect(() => {
    setSavedPosts(getSavedPosts());
  }, []);

  const handleToggleSave = (post: FeedPost) => {
    removeSavedPost(post.uri);
    setSavedPosts(getSavedPosts());
  };

  const toFeedPost = (post: SavedPost): FeedPost => ({
    uri: post.uri,
    cid: post.cid,
    author: post.author,
    record: post.record,
    replyCount: post.replyCount ?? 0,
    repostCount: post.repostCount ?? 0,
    likeCount: post.likeCount ?? 0,
    embed: post.embed,
    viewer: post.viewer,
  });

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
            {savedPosts.map((post) => {
              const feedPost = toFeedPost(post);
              return (
                <PostCard
                  key={feedPost.uri}
                  post={feedPost}
                  isSaved
                  onToggleSave={handleToggleSave}
                />
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
