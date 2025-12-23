import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { FeedPost, PostCard } from '@/components/feed/PostCard';
import { getSavedPosts, removeSavedPost, savePost, SavedPost } from '@/lib/savedPosts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { CommentDialog } from '@/components/feed/CommentDialog';
import { usePageMeta } from '@/lib/seo';

interface ThreadViewPost {
  post: any;
  replies?: ThreadViewPost[];
}

const mapPostView = (post: any): FeedPost => ({
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
});

function ReplyTree({ replies, depth }: { replies: ThreadViewPost[]; depth: number }) {
  if (!replies || replies.length === 0) return null;
  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <div
          key={reply.post.uri}
          className="border-l border-border"
          style={{ paddingLeft: Math.min(depth + 1, 4) * 16 }}
        >
          <PostCard post={mapPostView(reply.post)} isSaved={false} onToggleSave={() => undefined} />
          {reply.replies && <ReplyTree replies={reply.replies} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

export default function PostDetailPage() {
  const { handle, postId } = useParams<{ handle: string; postId: string }>();
  const [thread, setThread] = useState<ThreadViewPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedUris, setSavedUris] = useState<Set<string>>(new Set());
  const [commentOpen, setCommentOpen] = useState(false);

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

  useEffect(() => {
    const fetchThread = async () => {
      if (!handle || !postId) return;
      setIsLoading(true);
      setError(null);

      try {
        const resolve = await atprotoClient.resolveHandle(handle);
        if (!resolve.success || !resolve.data?.did) {
          setError('Unable to resolve handle.');
          return;
        }
        const uri = `at://${resolve.data.did}/app.bsky.feed.post/${postId}`;
        const result = await atprotoClient.getPostThread(uri, 3, 2);
        if (result.success && result.data?.post) {
          setThread(result.data as ThreadViewPost);
        } else {
          setError('Post not found.');
        }
      } catch (err) {
        setError('Failed to load post.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchThread();
  }, [handle, postId]);

  const rootPost = useMemo(() => {
    if (!thread?.post) return null;
    return mapPostView(thread.post);
  }, [thread]);

  const postDescription = useMemo(() => {
    const text = rootPost?.record?.text?.trim();
    if (!text) return 'Post on HiiSide.';
    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  }, [rootPost]);

  usePageMeta({
    title: rootPost?.author?.handle ? `Post by @${rootPost.author.handle}` : 'Post',
    description: postDescription,
  });

  if (!handle || !postId) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 flex items-center">
          <h1 className="font-semibold text-foreground text-lg">Post</h1>
        </div>
      </header>

      <div className="animate-fade-in">
        {isLoading ? (
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
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-destructive">{error}</div>
        ) : rootPost ? (
          <div>
            <PostCard
              post={rootPost}
              isSaved={savedUris.has(rootPost.uri)}
              onToggleSave={toggleSave}
            />
            <div className="px-4 pt-2 pb-4 border-b border-border">
              <Button variant="outline" onClick={() => setCommentOpen(true)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Write a reply
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {thread?.replies && thread.replies.length > 0 ? (
                <ReplyTree replies={thread.replies} depth={0} />
              ) : (
                <p className="text-sm text-muted-foreground">No replies yet.</p>
              )}
            </div>
            <CommentDialog
              open={commentOpen}
              onOpenChange={setCommentOpen}
              post={rootPost}
            />
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
