import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { chatApi, ChatApiError, ChatConvo, ChatMessage } from '@/lib/chat';
import { MessageList } from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
  const map = new Map<string, ChatMessage>();
  [...existing, ...incoming].forEach((message) => {
    map.set(message.id, message);
  });
  return Array.from(map.values()).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
};

export default function ChatThreadPage() {
  const { convoId } = useParams<{ convoId: string }>();
  const navigate = useNavigate();
  const { user, hasChatSession, isChatSessionLoading, isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convo, setConvo] = useState<ChatConvo | null>(null);
  const [readMarked, setReadMarked] = useState(false);

  const fetchConvo = async () => {
    if (!convoId) return;
    try {
      const result = await chatApi.listConvos({ limit: 50 });
      const match = result.convos.find((item) => item.id === convoId);
      setConvo(match ?? null);
    } catch {
      setConvo(null);
    }
  };

  const fetchMessages = async (reset = false) => {
    if (!convoId) return;
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await chatApi.getMessages({
        convoId,
        limit: 30,
        cursor: reset ? undefined : cursor,
      });
      setMessages((prev) => mergeMessages(reset ? [] : prev, response.messages));
      setCursor(response.cursor);
      setReadMarked(false);
    } catch (err) {
      if (err instanceof ChatApiError && err.status === 401) {
        navigate('/auth', { replace: true });
        return;
      }
      setError('Failed to load messages.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || isChatSessionLoading || !hasChatSession || !convoId) return;
    fetchConvo();
    fetchMessages(true);
  }, [isAuthenticated, isChatSessionLoading, hasChatSession, convoId]);

  useEffect(() => {
    if (!convoId || readMarked || messages.length === 0) return;
    chatApi.updateRead(convoId).then(() => setReadMarked(true)).catch(() => undefined);
  }, [convoId, readMarked, messages.length]);

  const handleSend = async (text: string) => {
    if (!convoId || !user?.did) return;
    setIsSending(true);
    const tempId =
      globalThis.crypto?.randomUUID?.() ?? `temp-${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      id: tempId,
      text,
      sentAt: new Date().toISOString(),
      senderDid: user.did,
      isPending: true,
    };
    setMessages((prev) => mergeMessages(prev, [optimistic]));

    try {
      const sent = await chatApi.sendMessage(convoId, text);
      setMessages((prev) => mergeMessages(prev.filter((msg) => msg.id !== tempId), [sent]));
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const otherMember = useMemo(() => {
    if (!convo || !user?.did) return null;
    return convo.members.find((member) => member.did !== user.did) ?? convo.members[0];
  }, [convo, user?.did]);

  if (!convoId) {
    return <Navigate to="/chat" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isChatSessionLoading && !hasChatSession) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/chat" aria-label="Back to inbox">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground">
              {otherMember?.displayName || otherMember?.handle || 'Conversation'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {otherMember?.handle ? `@${otherMember.handle}` : convoId}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        {error && (
          <div className="px-6 py-4">
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          </div>
        )}

        <MessageList
          messages={messages}
          currentUserDid={user?.did}
          isLoading={isLoading}
          hasMore={Boolean(cursor)}
          isLoadingMore={isLoadingMore}
          onLoadMore={() => fetchMessages(false)}
        />

        <MessageComposer onSend={handleSend} isSending={isSending} />
      </div>
    </AppLayout>
  );
}
