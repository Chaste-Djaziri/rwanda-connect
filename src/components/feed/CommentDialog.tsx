import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { atprotoClient } from '@/lib/atproto';
import { toast } from '@/components/ui/sonner';
import type { FeedPost } from '@/components/feed/PostCard';

export function CommentDialog({
  open,
  onOpenChange,
  post,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: FeedPost;
  onSubmitted?: () => void;
}) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setText('');
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast('Write a reply to send');
      return;
    }
    if (trimmed.length > 300) {
      toast('Replies are limited to 300 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await atprotoClient.createReply({
        text: trimmed,
        replyToUri: post.uri,
        replyToCid: post.cid,
        rootUri: post.uri,
        rootCid: post.cid,
      });
      if (result.success) {
        toast('Reply sent');
        onOpenChange(false);
        onSubmitted?.();
      } else {
        toast(result.error || 'Failed to send reply');
      }
    } catch {
      toast('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Reply</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Write and send a reply to this post.
        </DialogDescription>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                {post.author.avatar ? (
                  <img src={post.author.avatar} alt={post.author.handle} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {post.author.handle[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {post.author.displayName || post.author.handle}
                </p>
                <p className="text-xs text-muted-foreground truncate">@{post.author.handle}</p>
                <p className="text-sm text-foreground mt-2 whitespace-pre-wrap break-words">
                  {post.record.text}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write your reply..."
              className="min-h-[140px]"
              maxLength={300}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>300 character limit</span>
              <span>{text.length}/300</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Reply'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
