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
  readStatusLabel?: string;
  forceScrollToken?: string;
}

export function MessageList({
  messages,
  currentUserDid,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  readStatusLabel,
  forceScrollToken,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!isAtBottom) return;
    const node = containerRef.current;
    node.scrollTop = node.scrollHeight;
  }, [messages, isAtBottom]);

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
  };

  const jumpToLatest = () => {
    const node = containerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
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
    <div className="relative flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
        <div className="flex flex-col gap-4 px-6 pt-6 pb-24">
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load older messages'}
              </Button>
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
          {messages.length > 0 && readStatusLabel && (
            <div className="text-xs text-muted-foreground text-right">{readStatusLabel}</div>
          )}
        </div>
      </div>
      {!isAtBottom && (
        <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center">
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
