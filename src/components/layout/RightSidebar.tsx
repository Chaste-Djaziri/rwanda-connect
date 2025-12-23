import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MessageSquare, Search, TrendingUp, UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { chatApi, ChatConvo } from '@/lib/chat';
import { useAuth } from '@/contexts/AuthContext';
import { atprotoClient } from '@/lib/atproto';
import { VerifiedBadge } from '@/components/VerifiedBadge';

const consolidatedMessage = (message?: { text?: string; isDeleted?: boolean }) => {
  if (!message) return 'Start chatting';
  if (message.text) return message.text;
  if (message.isDeleted) return 'Message deleted';
  return 'Start chatting';
};

export function RightSidebar() {
  const rightOffset = 'calc(50% - 17.5vw - 20rem - 3rem)';
  const location = useLocation();
  const { hasChatSession, isChatSessionLoading, isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentConvos, setRecentConvos] = useState<ChatConvo[]>([]);
  const [isLoadingConvos, setIsLoadingConvos] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<{ topic: string; displayName?: string; link: string }[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const isChatRoute = location.pathname.startsWith('/chat');

  useEffect(() => {
    if (!isChatRoute) return;
    if (!isAuthenticated || isChatSessionLoading || !hasChatSession) {
      setRecentConvos([]);
      return;
    }

    const fetchRecentConvos = async () => {
      setIsLoadingConvos(true);
      try {
        const result = await chatApi.listConvos({ limit: 5 });
        setRecentConvos(result.convos);
      } catch {
        setRecentConvos([]);
      } finally {
        setIsLoadingConvos(false);
      }
    };

    fetchRecentConvos();
  }, [isChatRoute, isAuthenticated, isChatSessionLoading, hasChatSession]);

  useEffect(() => {
    if (isChatRoute) return;
    const fetchTrends = async () => {
      setIsLoadingTrends(true);
      try {
        const result = await atprotoClient.getTrendingTopics(12);
        if (result.success && result.data) {
          setTrendingTopics(result.data);
        } else {
          setTrendingTopics([]);
        }
      } catch {
        setTrendingTopics([]);
      } finally {
        setIsLoadingTrends(false);
      }
    };

    fetchTrends();
  }, [isChatRoute]);

  useEffect(() => {
    if (isChatRoute) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let active = true;
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await atprotoClient.searchActors(query);
        if (!active) return;
        setSearchResults(result.success && result.data ? result.data : []);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery, isChatRoute]);

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

  return (
    <aside
      className="fixed top-6 bottom-6 w-80 bg-transparent hidden xl:flex flex-col z-40 px-6"
      style={{ right: rightOffset }}
    >
      {/* Search */}
      <div className="pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={isChatRoute ? 'Search chats...' : 'Search Hillside...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/40 border-transparent focus:border-primary/50 rounded-full"
          />
          {!isChatRoute && (isSearching || searchResults.length > 0) && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-border bg-background shadow-card z-20 overflow-hidden">
              {isSearching ? (
                <div className="p-3 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No users found.</div>
              ) : (
                <div className="py-2">
                  {searchResults.map((actor: any) => (
                    <Link
                      key={actor.did}
                      to={`/profile/${actor.handle}`}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40 transition-colors"
                      onClick={() => setSearchQuery('')}
                    >
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                        {actor.avatar ? (
                          <img
                            src={actor.avatar}
                            alt={actor.displayName || actor.handle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {actor.handle?.[0]?.toUpperCase() ?? 'U'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {actor.displayName || actor.handle}
                          </p>
                          {actor.verification?.verifiedStatus === 'valid' && (
                            <VerifiedBadge className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">@{actor.handle}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isChatRoute ? (
        <>
          <div className="pt-6">
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Recent conversations</h2>
                </div>
              </div>
              <div className="divide-y divide-border">
                {isLoadingConvos ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="px-5 py-4 flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))
                ) : recentConvos.length > 0 ? (
                  recentConvos.map((convo) => {
                    const other = convo.members.find((member) => member.did !== user?.did) ?? convo.members[0];
                    return (
                      <Link
                        key={convo.id}
                        to={`/chat/${convo.id}`}
                        className="block px-5 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                            {other?.avatar ? (
                              <img
                                src={other.avatar}
                                alt={other.displayName || other.handle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                                {other?.handle?.[0]?.toUpperCase() ?? 'C'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-sm text-foreground truncate">
                                {other?.displayName || other?.handle || 'Conversation'}
                              </p>
                              {other?.verified && <VerifiedBadge className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {convo.lastMessage?.text ||
                                (consolidatedMessage(convo.lastMessage))}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(convo.lastMessage?.sentAt)}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                    No conversations yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex-1 overflow-auto">
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Suggested</h2>
                </div>
              </div>
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Suggested contacts will appear here once available.
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="pt-6 space-y-6">
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Getting started</h2>
                <button className="text-muted-foreground hover:text-foreground transition-colors" type="button">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-3 w-3 rounded-full border border-primary/70 bg-primary/10" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Follow 10 accounts</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Bluesky is better with friends!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-full bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Find people to follow
                </button>
              </div>
            </div>

            <div className="px-1 text-sm space-y-2 text-muted-foreground">
              <button className="block w-full text-left hover:text-foreground transition-colors" type="button">
                Discover
              </button>
              <button className="block w-full text-left hover:text-foreground transition-colors" type="button">
                Following
              </button>
              <button
                className="block w-full text-left text-primary hover:text-primary/80 transition-colors"
                type="button"
              >
                More feeds
              </button>
            </div>

            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Trending</h2>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors" type="button">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {isLoadingTrends ? (
                  [...Array(6)].map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)
                ) : trendingTopics.length > 0 ? (
                  trendingTopics.map((trend) => (
                    <a
                      key={trend.link || trend.topic}
                      href={trend.link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-full border border-border text-xs text-foreground/90 hover:bg-muted/50 transition-colors"
                    >
                      {trend.displayName || trend.topic}
                    </a>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No trending topics available.</div>
                )}
              </div>
            </div>

            <div className="px-1 text-xs text-muted-foreground space-x-2">
              <button type="button" className="hover:text-foreground transition-colors">
                Feedback
              </button>
              <span>·</span>
              <button type="button" className="hover:text-foreground transition-colors">
                Privacy
              </button>
              <span>·</span>
              <button type="button" className="hover:text-foreground transition-colors">
                Terms
              </button>
              <span>·</span>
              <button type="button" className="hover:text-foreground transition-colors">
                Help
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-auto pb-6" />
    </aside>
  );
}
