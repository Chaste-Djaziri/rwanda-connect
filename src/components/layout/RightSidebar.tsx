import { useState, useEffect } from 'react';
import { Search, TrendingUp, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { atprotoClient } from '@/lib/atproto';

interface SuggestedUser {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

// Placeholder trending topics (AT Protocol doesn't have a direct trending endpoint)
const placeholderTrends = [
  { tag: 'Rwanda', count: '2.4K' },
  { tag: 'Tech', count: '1.8K' },
  { tag: 'ATProtocol', count: '892' },
  { tag: 'Kigali', count: '654' },
  { tag: 'Innovation', count: '423' },
];

export function RightSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const result = await atprotoClient.getSuggestions(undefined, 5);
        if (result.success && result.data) {
          setSuggestions(
            result.data.map((actor: any) => ({
              did: actor.did,
              handle: actor.handle,
              displayName: actor.displayName,
              avatar: actor.avatar,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, []);

  return (
    <aside className="fixed right-0 top-0 h-screen w-80 border-l border-border bg-background hidden lg:flex flex-col z-40">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Imvura..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-transparent focus:border-primary/50"
          />
        </div>
      </div>

      {/* Trending Topics */}
      <div className="px-4 py-2">
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Trending</h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {/* TODO: Replace with real trending data when AT Protocol provides endpoint */}
            {placeholderTrends.map((trend) => (
              <button
                key={trend.tag}
                className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-foreground">#{trend.tag}</p>
                <p className="text-xs text-muted-foreground">{trend.count} posts</p>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Trending data placeholder · AT Protocol integration pending
            </p>
          </div>
        </div>
      </div>

      {/* Who to Follow */}
      <div className="px-4 py-2 flex-1 overflow-auto">
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Who to follow</h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {isLoadingSuggestions ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))
            ) : suggestions.length > 0 ? (
              suggestions.map((user) => (
                <div
                  key={user.did}
                  className="p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName || user.handle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {user.handle[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {user.displayName || user.handle}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{user.handle}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No suggestions available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2024 Imvura · Built on AT Protocol
        </p>
      </div>
    </aside>
  );
}
