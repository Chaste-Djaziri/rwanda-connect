import { Link } from 'react-router-dom';
import { ChatConvo } from '@/lib/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { VerifiedBadge } from '@/components/VerifiedBadge';

interface ConversationRowProps {
  convo: ChatConvo;
  isActive?: boolean;
  currentUserDid?: string;
}

const formatTime = (dateString?: string) => {
  if (!dateString) return '';
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

export function ConversationRow({ convo, isActive, currentUserDid }: ConversationRowProps) {
  const other = convo.members.find((member) => member.did !== currentUserDid) ?? convo.members[0];
  const preview = convo.lastMessage?.text || (convo.lastMessage?.isDeleted ? 'Message deleted' : 'Start the conversation');

  return (
    <Link
      to={`/chat/${convo.id}`}
      className={cn(
        'flex items-center gap-4 px-4 py-3 border-b border-border transition-colors',
        'hover:bg-muted/40',
        isActive && 'bg-primary/5'
      )}
    >
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={other?.avatar} alt={other?.displayName || other?.handle} />
        <AvatarFallback>{other?.handle?.[0]?.toUpperCase() ?? 'C'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground truncate inline-flex items-center gap-1">
            {other?.displayName || other?.handle || 'Conversation'}
            <VerifiedBadge
              className="w-3.5 h-3.5 text-primary"
              handle={other?.handle}
              verified={other?.verified}
            />
          </p>
          {convo.status === 'request' && (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Request
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{preview}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">{formatTime(convo.lastMessage?.sentAt)}</span>
        {convo.unreadCount > 0 && (
          <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
            {convo.unreadCount > 99 ? '99+' : convo.unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}
