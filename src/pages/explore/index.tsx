import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { atprotoClient } from '@/lib/atproto';
import { Compass, Search, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { usePageMeta } from '@/lib/seo';

interface SuggestedFeed {
  uri: string;
  cid: string;
  displayName: string;
  description?: string;
  avatar?: string;
  likeCount?: number;
  creator: {
    did: string;
    handle: string;
    displayName?: string;
    verified?: boolean;
  };
}

interface SuggestedActor {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  followersCount?: number;
  verified?: boolean;
}

function FeedCard({ feed }: { feed: SuggestedFeed }) {
  return (
    <div className="p-4 border-b border-border hover:bg-muted/30 transition-colors">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
          {feed.avatar ? (
            <img src={feed.avatar} alt={feed.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center gradient-primary">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{feed.displayName}</h3>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
            by{' '}
            <Link
              to={`/profile/${feed.creator.handle}`}
              className="hover:text-foreground transition-colors"
            >
              @{feed.creator.handle}
            </Link>
            <VerifiedBadge
              className="w-3.5 h-3.5 text-primary"
              handle={feed.creator?.handle}
              verified={feed.creator?.verified}
            />
          </p>
          {feed.description && (
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{feed.description}</p>
          )}
          {typeof feed.likeCount === 'number' && (
            <p className="text-xs text-muted-foreground mt-2">
              {feed.likeCount.toLocaleString()} likes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActorCard({ actor }: { actor: SuggestedActor }) {
  return (
    <Link to={`/profile/${actor.handle}`} className="block p-4 border-b border-border hover:bg-muted/30 transition-colors">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
          {actor.avatar ? (
            <img
              src={actor.avatar}
              alt={actor.displayName || actor.handle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
              {actor.handle[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="font-semibold text-foreground truncate">
              {actor.displayName || actor.handle}
            </h3>
            <VerifiedBadge
              className="w-4 h-4 text-primary"
              handle={actor.handle}
              verified={actor.verified}
            />
          </div>
          <p className="text-sm text-muted-foreground truncate">@{actor.handle}</p>
          {actor.description && (
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{actor.description}</p>
          )}
          {typeof actor.followersCount === 'number' && (
            <p className="text-xs text-muted-foreground mt-2">
              {actor.followersCount.toLocaleString()} followers
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ExploreSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  usePageMeta({
    title: 'Explore',
    description: 'Discover people and feeds across HiiSide.',
  });
  const [activeTab, setActiveTab] = useState<'feeds' | 'people'>('feeds');
  const [feeds, setFeeds] = useState<SuggestedFeed[]>([]);
  const [actors, setActors] = useState<SuggestedActor[]>([]);
  const [defaultActors, setDefaultActors] = useState<SuggestedActor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchExploreData = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch suggested feeds
      const feedsResult = await atprotoClient.getSuggestedFeeds();
      if (feedsResult.success && feedsResult.data) {
        setFeeds(
          feedsResult.data.map((feed: any) => ({
            uri: feed.uri,
            cid: feed.cid,
            displayName: feed.displayName,
            description: feed.description,
            avatar: feed.avatar,
            likeCount: feed.likeCount,
            creator: {
              did: feed.creator.did,
              handle: feed.creator.handle,
              displayName: feed.creator.displayName,
              verified: feed.creator.verification?.verifiedStatus === 'valid',
            },
          }))
        );
      }

      // Fetch suggested people
      const actorsResult = await atprotoClient.getSuggestions();
      if (actorsResult.success && actorsResult.data) {
        const mappedActors = actorsResult.data.map((actor: any) => ({
          did: actor.did,
          handle: actor.handle,
          displayName: actor.displayName,
          description: actor.description,
          avatar: actor.avatar,
          followersCount: actor.followersCount,
          verified: actor.verification?.verifiedStatus === 'valid',
        }));
        setActors(mappedActors);
        setDefaultActors(mappedActors);
      }
    } catch (err) {
      setError('Failed to load explore content');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExploreData(true);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setIsSearching(false);
      setActors(defaultActors);
      return;
    }
    let active = true;
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await atprotoClient.searchActors(query);
        if (!active) return;
        if (result.success && result.data) {
          setActors(
            result.data.map((actor: any) => ({
              did: actor.did,
              handle: actor.handle,
              displayName: actor.displayName,
              description: actor.description,
              avatar: actor.avatar,
              followersCount: actor.followersCount,
              verified: actor.verification?.verifiedStatus === 'valid',
            }))
          );
          setActiveTab('people');
        }
      } catch {
        if (active) setError('Search failed');
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery, defaultActors]);

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-4 h-14 flex items-center justify-between">
          <h1 className="font-semibold text-foreground text-lg">Explore</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchExploreData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" disabled>
              Search
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('feeds')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'feeds' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Feeds
            </div>
            {activeTab === 'feeds' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'people' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              People
            </div>
            {activeTab === 'people' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="animate-fade-in">
        {error && (
          <div className="p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
            <Button variant="ghost" size="sm" onClick={() => fetchExploreData(true)} className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {isLoading || isSearching ? (
          <div>
            {[...Array(6)].map((_, i) => (
              <ExploreSkeleton key={i} />
            ))}
          </div>
        ) : activeTab === 'feeds' ? (
          feeds.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">No feeds found</h2>
              <p className="text-muted-foreground">Check back later for suggested feeds</p>
            </div>
          ) : (
            <div>
              {feeds.map((feed) => (
                <FeedCard key={feed.uri} feed={feed} />
              ))}
            </div>
          )
        ) : actors.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No people found</h2>
            <p className="text-muted-foreground">Try searching for specific users</p>
          </div>
        ) : (
          <div>
            {actors.map((actor) => (
              <ActorCard key={actor.did} actor={actor} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
