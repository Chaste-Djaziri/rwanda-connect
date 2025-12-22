import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar, List, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FeedPost, PostCard } from '@/components/feed/PostCard';
import { getSavedPosts, removeSavedPost, savePost, SavedPost } from '@/lib/savedPosts';

interface ProfileData {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  createdAt?: string;
}

type TabKey =
  | 'posts'
  | 'replies'
  | 'media'
  | 'videos'
  | 'likes'
  | 'feeds'
  | 'starterPacks'
  | 'lists';

interface TabState<T> {
  items: T[];
  cursor?: string;
  isLoading: boolean;
  error?: string | null;
  hasLoaded: boolean;
}

const createInitialTabState = (): Record<TabKey, TabState<any>> => ({
  posts: { items: [], cursor: undefined, isLoading: false, error: null, hasLoaded: false },
  replies: { items: [], cursor: undefined, isLoading: false, error: null, hasLoaded: false },
  media: { items: [], cursor: undefined, isLoading: false, error: null, hasLoaded: false },
  videos: { items: [], cursor: undefined, isLoading: false, error: null, hasLoaded: false },
  likes: { items: [], cursor: undefined, isLoading: false, error: null, hasLoaded: false },
  feeds: { items: [], cursor: undefined, isLoading: false, error: null, hasLoaded: false },
  starterPacks: { items: [], cursor: undefined, isLoading: false, error: null, hasLoaded: false },
  lists: { items: [], cursor: undefined, isLoading: false, error: null, hasLoaded: false },
});

const tabConfig: Array<{ key: TabKey; label: string }> = [
  { key: 'posts', label: 'Posts' },
  { key: 'replies', label: 'Replies' },
  { key: 'media', label: 'Media' },
  { key: 'videos', label: 'Videos' },
  { key: 'likes', label: 'Likes' },
  { key: 'feeds', label: 'Feeds' },
  { key: 'starterPacks', label: 'Starter packs' },
  { key: 'lists', label: 'Lists' },
];

const mapFeedItem = (item: any): FeedPost => ({
  uri: item.post.uri,
  cid: item.post.cid,
  author: {
    did: item.post.author.did,
    handle: item.post.author.handle,
    displayName: item.post.author.displayName,
    avatar: item.post.author.avatar,
  },
  record: {
    text: item.post.record.text,
    createdAt: item.post.record.createdAt,
  },
  replyCount: item.post.replyCount ?? 0,
  repostCount: item.post.repostCount ?? 0,
  likeCount: item.post.likeCount ?? 0,
  embed: item.post.embed,
});

function PostSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        <Skeleton className="w-11 h-11 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-6 pt-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedCard({
  feed,
  onPin,
  isPinning,
  isPinned,
}: {
  feed: any;
  onPin: (uri: string) => void;
  isPinning: boolean;
  isPinned: boolean;
}) {
  const feedId = feed.uri?.split('/').pop();
  const route = feedId ? `/profile/${feed.creator?.handle}/feed/${feedId}` : '#';
  return (
    <Link to={route} className="block p-4 border-b border-border hover:bg-muted/30 transition-colors">
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
          <h3 className="font-semibold text-foreground truncate">
            {feed.displayName || feed?.record?.displayName || 'Feed'}
          </h3>
          {feed.creator?.handle && (
            <p className="text-sm text-muted-foreground truncate">by @{feed.creator.handle}</p>
          )}
          {(feed.description || feed?.record?.description) && (
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2">
              {feed.description || feed?.record?.description}
            </p>
          )}
          {typeof feed.likeCount === 'number' && (
            <p className="text-xs text-muted-foreground mt-2">
              {feed.likeCount.toLocaleString()} likes
            </p>
          )}
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onPin(feed.uri);
            }}
            disabled={isPinning}
          >
            {isPinned ? 'Unpin' : 'Pin Feed'}
          </Button>
        </div>
      </div>
    </Link>
  );
}

function StarterPackCard({ pack }: { pack: any }) {
  return (
    <div className="p-4 border-b border-border hover:bg-muted/30 transition-colors">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
          {pack.avatar ? (
            <img src={pack.avatar} alt={pack.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center gradient-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {pack.displayName || pack?.record?.name || 'Starter pack'}
          </h3>
          {pack.creator?.handle && (
            <p className="text-sm text-muted-foreground truncate">by @{pack.creator.handle}</p>
          )}
          {(pack.description || pack?.record?.description) && (
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2">
              {pack.description || pack?.record?.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ListCard({ list }: { list: any }) {
  return (
    <div className="p-4 border-b border-border hover:bg-muted/30 transition-colors">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
          {list.avatar ? (
            <img src={list.avatar} alt={list.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center gradient-primary">
              <List className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{list.name || 'List'}</h3>
          {list.creator?.handle && (
            <p className="text-sm text-muted-foreground truncate">by @{list.creator.handle}</p>
          )}
          {list.description && (
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{list.description}</p>
          )}
          {list.purpose && (
            <p className="text-xs text-muted-foreground mt-2">{list.purpose.replace('app.bsky.graph.defs#', '')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [savedUris, setSavedUris] = useState<Set<string>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [pinningFeedUri, setPinningFeedUri] = useState<string | null>(null);
  const [pinnedFeedUris, setPinnedFeedUris] = useState<Set<string>>(new Set());
  const [tabVisibility, setTabVisibility] = useState<Record<TabKey, boolean>>({
    posts: true,
    replies: false,
    media: false,
    videos: false,
    likes: false,
    feeds: false,
    starterPacks: false,
    lists: false,
  });
  const [tabData, setTabData] = useState<Record<TabKey, TabState<any>>>(createInitialTabState);
  const isOwnProfile = profile?.handle && user?.handle && profile.handle === user.handle;
  const availableTabs = useMemo(
    () => tabConfig.filter((tab) => tabVisibility[tab.key]),
    [tabVisibility]
  );

  useEffect(() => {
    const saved = getSavedPosts().map((post) => post.uri);
    setSavedUris(new Set(saved));
  }, []);

  useEffect(() => {
    const loadPinnedFeeds = async () => {
      const prefsResult = await atprotoClient.getPreferences();
      if (!prefsResult.success || !prefsResult.data) return;
      const savedPref = prefsResult.data.find(
        (pref: any) =>
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPrefV2' ||
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPref'
      );
      const items: Array<{ value: string; pinned: boolean }> = savedPref?.items || [];
      setPinnedFeedUris(new Set(items.filter((item) => item.pinned).map((item) => item.value)));
    };
    loadPinnedFeeds().catch(() => undefined);
  }, []);

  const toggleSave = useCallback((post: FeedPost) => {
    setSavedUris((prev) => {
      const next = new Set(prev);
      if (next.has(post.uri)) {
        next.delete(post.uri);
        removeSavedPost(post.uri);
      } else {
        savePost(post as SavedPost);
        next.add(post.uri);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (availableTabs.length === 0) return;
    if (!availableTabs.find((tab) => tab.key === activeTab)) {
      setActiveTab(availableTabs[0].key as typeof activeTab);
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    const fetchProfile = async () => {
      const targetHandle = handle?.replace(/^@/, '') || user?.handle;
      if (!isAuthenticated || authLoading || !targetHandle) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await atprotoClient.getProfile(targetHandle);
        if (result.success && result.data) {
          setProfile({
            did: result.data.did,
            handle: result.data.handle,
            displayName: result.data.displayName,
            description: result.data.description,
            avatar: result.data.avatar,
            banner: result.data.banner,
            followersCount: result.data.followersCount ?? 0,
            followsCount: result.data.followsCount ?? 0,
            postsCount: result.data.postsCount ?? 0,
            createdAt: result.data.createdAt,
          });
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        setError('Failed to fetch profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [authLoading, isAuthenticated, user?.handle, handle]);

  useEffect(() => {
    if (!profile) return;
    setTabData(createInitialTabState());
  }, [profile?.did, profile?.handle]);

  useEffect(() => {
    if (!profile || authLoading || !isAuthenticated) return;
    if (isOwnProfile) {
      setTabVisibility({
        posts: true,
        replies: true,
        media: true,
        videos: true,
        likes: true,
        feeds: true,
        starterPacks: true,
        lists: true,
      });
      return;
    }

    setTabVisibility({
      posts: (profile.postsCount ?? 0) > 0,
      replies: false,
      media: false,
      videos: false,
      likes: false,
      feeds: false,
      starterPacks: false,
      lists: false,
    });

    let isActive = true;
    const actor = profile.did || profile.handle;

    const checkTab = async (tab: TabKey) => {
      try {
        let result: any;
        switch (tab) {
          case 'replies':
            result = await atprotoClient.getAuthorFeed(actor, 'posts_with_replies', undefined, 1);
            break;
          case 'media':
            result = await atprotoClient.getAuthorFeed(actor, 'posts_with_media', undefined, 1);
            break;
          case 'videos':
            result = await atprotoClient.getAuthorFeed(actor, 'posts_with_video', undefined, 1);
            break;
          case 'likes':
            result = await atprotoClient.getActorLikes(actor, undefined, 1);
            break;
          case 'feeds':
            result = await atprotoClient.getActorFeeds(actor, undefined, 1);
            break;
          case 'starterPacks':
            result = await atprotoClient.getActorStarterPacks(actor, undefined, 1);
            break;
          case 'lists':
            result = await atprotoClient.getActorLists(actor, undefined, 1);
            break;
          default:
            return;
        }
        if (!isActive) return;
        if (result?.success && Array.isArray(result.data) && result.data.length > 0) {
          setTabVisibility((prev) => ({ ...prev, [tab]: true }));
        }
      } catch (err) {
        if (!isActive) return;
        setTabVisibility((prev) => ({ ...prev, [tab]: false }));
      }
    };

    const tabsToCheck: TabKey[] = ['replies', 'media', 'videos', 'likes', 'feeds', 'starterPacks', 'lists'];
    Promise.all(tabsToCheck.map((tab) => checkTab(tab))).catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [profile?.did, profile?.handle, profile?.postsCount, isOwnProfile, authLoading, isAuthenticated]);

  const fetchTabData = useCallback(
    async (tab: TabKey, refresh = false) => {
      if (!profile) return;
      const actor = profile.did || profile.handle;
      const cursor = refresh ? undefined : tabData[tab].cursor;

      setTabData((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], isLoading: true, error: null },
      }));

      try {
        let result: any;
        switch (tab) {
          case 'posts':
            result = await atprotoClient.getAuthorFeed(actor, 'posts_no_replies', cursor, 30);
            break;
          case 'replies':
            result = await atprotoClient.getAuthorFeed(actor, 'posts_with_replies', cursor, 30);
            break;
          case 'media':
            result = await atprotoClient.getAuthorFeed(actor, 'posts_with_media', cursor, 30);
            break;
          case 'videos':
            result = await atprotoClient.getAuthorFeed(actor, 'posts_with_video', cursor, 30);
            break;
          case 'likes':
            result = await atprotoClient.getActorLikes(actor, cursor, 30);
            break;
          case 'feeds':
            result = await atprotoClient.getActorFeeds(actor, cursor, 30);
            break;
          case 'starterPacks':
            result = await atprotoClient.getActorStarterPacks(actor, cursor, 30);
            break;
          case 'lists':
            result = await atprotoClient.getActorLists(actor, cursor, 30);
            break;
          default:
            return;
        }

        if (result?.success && Array.isArray(result.data)) {
          const mapped =
            tab === 'feeds' || tab === 'starterPacks' || tab === 'lists'
              ? result.data
              : result.data.map((item: any) => mapFeedItem(item));
          setTabData((prev) => ({
            ...prev,
            [tab]: {
              items: refresh ? mapped : [...prev[tab].items, ...mapped],
              cursor: result.cursor,
              isLoading: false,
              error: null,
              hasLoaded: true,
            },
          }));
        } else {
          setTabData((prev) => ({
            ...prev,
            [tab]: { ...prev[tab], isLoading: false, error: 'Failed to load content', hasLoaded: true },
          }));
        }
      } catch (err) {
        setTabData((prev) => ({
          ...prev,
          [tab]: { ...prev[tab], isLoading: false, error: 'Failed to load content', hasLoaded: true },
        }));
      }
    },
    [profile, tabData]
  );

  const handlePinFeed = async (uri: string) => {
    if (pinningFeedUri) return;
    setPinningFeedUri(uri);
    if (pinnedFeedUris.has(uri)) {
      await atprotoClient.unpinFeed(uri, 'feed');
      setPinnedFeedUris((prev) => {
        const next = new Set(prev);
        next.delete(uri);
        return next;
      });
    } else {
      await atprotoClient.pinFeed(uri, 'feed');
      setPinnedFeedUris((prev) => new Set(prev).add(uri));
    }
    setPinningFeedUri(null);
  };

  useEffect(() => {
    if (!profile || !tabVisibility[activeTab]) return;
    if (tabData[activeTab].isLoading) return;
    if (tabData[activeTab].hasLoaded) return;
    fetchTabData(activeTab, true);
  }, [activeTab, profile?.did, profile?.handle, tabVisibility, tabData, fetchTabData]);

  useEffect(() => {
    const node = loadMoreRef.current;
    const currentTab = tabData[activeTab];
    if (!node || !currentTab.cursor) return;
    if (currentTab.isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchTabData(activeTab, false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, tabData, fetchTabData]);

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-4 h-14 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">
              {profile?.displayName || profile?.handle || 'Profile'}
            </h1>
            {profile && (
              <p className="text-xs text-muted-foreground">
                {profile.postsCount} posts
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="animate-fade-in">
        {/* Banner */}
        <div className="h-32 sm:h-48 bg-gradient-to-br from-primary/30 to-accent/20 relative">
          {profile?.banner && (
            <img 
              src={profile.banner} 
              alt="" 
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-6">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4 flex justify-between items-end">
            <div className="w-28 h-28 rounded-full border-4 border-background overflow-hidden bg-muted">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-full" />
              ) : profile?.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt={profile.displayName || profile.handle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                  {profile?.handle?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>

          {/* Name and Handle */}
          {isLoading ? (
            <div className="space-y-2 mb-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : (
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-foreground">
                {profile?.displayName || profile?.handle}
              </h2>
              <p className="text-muted-foreground">@{profile?.handle}</p>
            </div>
          )}

          {/* Stats */}
          {isLoading ? (
            <div className="flex gap-6 mb-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : (
            <div className="flex gap-6 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {profile?.postsCount?.toLocaleString() ?? '0'}
                </span>
                <span className="text-muted-foreground">Posts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {profile?.followsCount?.toLocaleString() ?? '0'}
                </span>
                <span className="text-muted-foreground">Following</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {profile?.followersCount?.toLocaleString() ?? '0'}
                </span>
                <span className="text-muted-foreground">Followers</span>
              </div>
            </div>
          )}

          {/* Bio */}
          {isLoading ? (
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : profile?.description ? (
            <p className="text-foreground mb-4 whitespace-pre-wrap leading-relaxed">
              {profile.description}
            </p>
          ) : null}

          {/* Metadata */}
          {profile?.createdAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-6 border-b border-border/60">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground sm:text-sm sm:grid-cols-4 md:grid-cols-8">
              {availableTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`py-3 border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary text-foreground'
                      : 'border-transparent hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="py-6">
            {availableTabs.length === 0 && (
              <div className="text-center text-sm text-muted-foreground">
                No public content available.
              </div>
            )}

            {availableTabs.length > 0 && (
              <div>
                {(activeTab === 'posts' ||
                  activeTab === 'replies' ||
                  activeTab === 'media' ||
                  activeTab === 'videos' ||
                  activeTab === 'likes') && (
                  <div>
                    {tabData[activeTab].isLoading && tabData[activeTab].items.length === 0 && (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <PostSkeleton key={`profile-post-${i}`} />
                        ))}
                      </>
                    )}

                    {tabData[activeTab].items.length === 0 && !tabData[activeTab].isLoading && (
                      <div className="text-center text-sm text-muted-foreground py-6">
                        No posts to show yet.
                      </div>
                    )}

                    {tabData[activeTab].items.length > 0 && (
                      <div>
                        {(tabData[activeTab].items as FeedPost[]).map((post) => (
                          <PostCard
                            key={post.uri}
                            post={post}
                            isSaved={savedUris.has(post.uri)}
                            onToggleSave={toggleSave}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'feeds' && (
                  <div>
                    {tabData.feeds.isLoading && tabData.feeds.items.length === 0 && (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <PostSkeleton key={`profile-feed-${i}`} />
                        ))}
                      </>
                    )}
                    {tabData.feeds.items.length === 0 && !tabData.feeds.isLoading && (
                      <div className="text-center text-sm text-muted-foreground py-6">
                        No feeds available.
                      </div>
                    )}
                    {tabData.feeds.items.map((feed: any) => (
                      <FeedCard
                        key={feed.uri}
                        feed={feed}
                        onPin={handlePinFeed}
                        isPinning={pinningFeedUri === feed.uri}
                        isPinned={pinnedFeedUris.has(feed.uri)}
                      />
                    ))}
                  </div>
                )}

                {activeTab === 'starterPacks' && (
                  <div>
                    {tabData.starterPacks.isLoading && tabData.starterPacks.items.length === 0 && (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <PostSkeleton key={`profile-pack-${i}`} />
                        ))}
                      </>
                    )}
                    {tabData.starterPacks.items.length === 0 && !tabData.starterPacks.isLoading && (
                      <div className="text-center text-sm text-muted-foreground py-6">
                        No starter packs available.
                      </div>
                    )}
                    {tabData.starterPacks.items.map((pack: any) => (
                      <StarterPackCard key={pack.uri} pack={pack} />
                    ))}
                  </div>
                )}

                {activeTab === 'lists' && (
                  <div>
                    {tabData.lists.isLoading && tabData.lists.items.length === 0 && (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <PostSkeleton key={`profile-list-${i}`} />
                        ))}
                      </>
                    )}
                    {tabData.lists.items.length === 0 && !tabData.lists.isLoading && (
                      <div className="text-center text-sm text-muted-foreground py-6">
                        No lists available.
                      </div>
                    )}
                    {tabData.lists.items.map((list: any) => (
                      <ListCard key={list.uri} list={list} />
                    ))}
                  </div>
                )}

                {tabData[activeTab].error && (
                  <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {tabData[activeTab].error}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchTabData(activeTab, true)}
                      className="ml-2"
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {tabData[activeTab].cursor && (
                  <div className="flex justify-center py-6">
                    <Button
                      variant="outline"
                      onClick={() => fetchTabData(activeTab, false)}
                      disabled={tabData[activeTab].isLoading}
                    >
                      {tabData[activeTab].isLoading ? 'Loading...' : 'Load more'}
                    </Button>
                  </div>
                )}

                {tabData[activeTab].cursor && <div ref={loadMoreRef} className="h-6" />}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
