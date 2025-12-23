import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { chatApi, ChatApiError, ChatConvo } from '@/lib/chat';
import { ConversationRow } from '@/components/chat/ConversationRow';
import { NewChatDialog } from '@/components/chat/NewChatDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasChatSession, isChatSessionLoading, isAuthenticated } = useAuth();

  const [convos, setConvos] = useState<ChatConvo[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadConvos = async (reset = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const result = await chatApi.listConvos({ limit: 20, cursor: reset ? undefined : cursor });
      setConvos((prev) => (reset ? result.convos : [...prev, ...result.convos]));
      setCursor(result.cursor);
    } catch (err) {
      if (err instanceof ChatApiError && err.status === 401) {
        navigate('/auth', { replace: true });
        return;
      }
      setError('Failed to load conversations.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || isChatSessionLoading || !hasChatSession) return;
    loadConvos(true);
  }, [isAuthenticated, isChatSessionLoading, hasChatSession]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !cursor) return;
    if (isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadConvos(false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, isLoading, isLoadingMore]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isChatSessionLoading && !hasChatSession) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Chat</h1>
            <p className="text-sm text-muted-foreground">Direct messages on Bluesky</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadConvos(true)}
              disabled={isLoading || isLoadingMore}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <NewChatDialog />
          </div>
        </div>
      </header>

      <div className="animate-fade-in">
        {error && (
          <div className="p-6">
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : convos.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <p className="text-sm">No conversations yet.</p>
            <p className="text-xs mt-2">Start a new chat with a DID or handle.</p>
          </div>
        ) : (
          <div>
            {convos.map((convo) => (
              <ConversationRow
                key={convo.id}
                convo={convo}
                isActive={location.pathname === `/chat/${convo.id}`}
                currentUserDid={user?.did}
              />
            ))}
          </div>
        )}

        {cursor && (
          <div className="flex justify-center py-6">
            <Button variant="outline" onClick={() => loadConvos(false)} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}

        {cursor && <div ref={loadMoreRef} className="h-6" />}
      </div>
    </AppLayout>
  );
}
