import { ChatMessage } from '@/lib/chat';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserDid?: string;
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function MessageList({
  messages,
  currentUserDid,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: MessageListProps) {
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
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-4 px-6 py-4">
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
      </div>
    </ScrollArea>
  );
}
