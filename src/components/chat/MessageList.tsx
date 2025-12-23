import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/lib/chat';
import { MessageBubble } from './MessageBubble';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserDid?: string;
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  forceScrollToken?: string;
}

export function MessageList({
  messages,
  currentUserDid,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  forceScrollToken,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isLoadingMoreRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!isAtBottom) return;
    const node = containerRef.current;
    node.scrollTop = node.scrollHeight;
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!isLoadingMore) {
      if (isLoadingMoreRef.current) {
        const node = containerRef.current;
        const prevHeight = prevScrollHeightRef.current;
        const prevTop = prevScrollTopRef.current;
        const nextHeight = node.scrollHeight;
        node.scrollTop = nextHeight - prevHeight + prevTop;
        isLoadingMoreRef.current = false;
      }
      return;
    }
    const node = containerRef.current;
    isLoadingMoreRef.current = true;
    prevScrollHeightRef.current = node.scrollHeight;
    prevScrollTopRef.current = node.scrollTop;
  }, [isLoadingMore]);

  useEffect(() => {
    if (!containerRef.current || !forceScrollToken) return;
    const node = containerRef.current;
    node.scrollTop = node.scrollHeight;
    setIsAtBottom(true);
  }, [forceScrollToken]);

  const handleScroll = () => {
    const node = containerRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsAtBottom(distance < 80);
    if (node.scrollTop < 80 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  };

  const jumpToLatest = () => {
    const node = containerRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    setIsAtBottom(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        {[...Array(6)].map((_, index) => (
          <Skeleton
            key={index}
            className={`h-10 ${index % 2 === 0 ? 'w-2/3 ml-auto' : 'w-1/2'}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
        <div className="flex flex-col gap-4 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {isLoadingMore && (
            <div className="flex justify-center">
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
          )}
          {messages.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation.
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderDid === currentUserDid}
            />
          ))}
        </div>
      </div>
      {!isAtBottom && (
        <div className="pointer-events-none absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto rounded-full shadow-sm"
            onClick={jumpToLatest}
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Latest messages
          </Button>
        </div>
      )}
    </div>
  );
}
