import { ChatMessage } from '@/lib/chat';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

const formatTime = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex flex-col max-w-[72%] gap-1',
        isOwn ? 'self-end items-end' : 'self-start items-start'
      )}
    >
      <div
        className={cn(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md',
          message.isPending && 'opacity-70'
        )}
      >
        {message.isDeleted ? 'Message deleted' : message.text}
      </div>
      <span className="text-[11px] text-muted-foreground">
        {message.isPending ? 'Sending...' : formatTime(message.sentAt)}
      </span>
    </div>
  );
}
