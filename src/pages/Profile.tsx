import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { atprotoClient } from '@/lib/atproto';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

          {/* Stats */}
          {isLoading ? (
            <div className="flex gap-6">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : (
            <div className="flex gap-6">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {profile?.followsCount.toLocaleString()}
                </span>
                <span className="text-muted-foreground">Following</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {profile?.followersCount.toLocaleString()}
                </span>
                <span className="text-muted-foreground">Followers</span>
              </div>
            </div>
          )}

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
