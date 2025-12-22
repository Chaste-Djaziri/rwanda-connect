import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Heart, Repeat2, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export interface FeedPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
  };
  replyCount: number;
  repostCount: number;
  likeCount: number;
  embed?: any;
}

const hashtagRegex = /#[A-Za-z0-9_]+/g;

const extractTags = (text: string) => {
  const matches = text.match(hashtagRegex) ?? [];
  const cleaned = matches.map((tag) => tag.replace('#', '')).filter(Boolean);
  return Array.from(new Set(cleaned));
};

const renderTextWithTags = (text: string) => {
  const parts: Array<{ text: string; tag?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = hashtagRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (start > lastIndex) {
      parts.push({ text: text.slice(lastIndex, start) });
    }
    parts.push({ text: match[0], tag: match[0].slice(1) });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts.map((part, index) =>
    part.tag ? (
      <Link
        key={`${part.tag}-${index}`}
        to={`/hashtag/${part.tag}`}
        className="text-primary hover:underline"
      >
        {part.text}
      </Link>
    ) : (
      <span key={`text-${index}`}>{part.text}</span>
    )
  );
};

const isGifUrl = (value?: string) => {
  if (!value) return false;
  return /\.(gif|gifv)(\?|$)/i.test(value);
};

const renderExternalEmbed = (embed: any) => {
  const external = embed?.external;
  if (!external) return null;
  const isGif = isGifUrl(external.uri);
  const isGifVideo = /\.gifv(\?|$)/i.test(external.uri);
  if (isGif) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        {isGifVideo ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto object-contain bg-black"
          >
            <source src={external.uri.replace(/\.gifv(\?.*)?$/i, '.mp4$1')} />
          </video>
        ) : (
          <img src={external.uri} alt="" className="w-full h-auto object-contain bg-black" />
        )}
      </div>
    );
  }
  return (
    <a
      href={external.uri}
      target="_blank"
      rel="noreferrer"
      className="mt-3 block overflow-hidden rounded-xl border border-border hover:bg-muted/20 transition-colors"
    >
      {external.thumb && (
        <img src={external.thumb} alt={external.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-3">
        <p className="text-sm font-semibold text-foreground">{external.title}</p>
        {external.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{external.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2 truncate">{external.uri}</p>
      </div>
    </a>
  );
};

function ImageGrid({ images }: { images: any[] }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const imageCount = images.length;
  const displayImages = imageCount > 4 ? images.slice(0, 4) : images;
  const remaining = imageCount - 4;
  const twoUpAspectRatio =
    imageCount === 2
      ? (() => {
          const ratios = images
            .map((image) => {
              const width = image?.aspectRatio?.width;
              const height = image?.aspectRatio?.height;
              if (!width || !height) return null;
              return width / height;
            })
            .filter((value): value is number => Number.isFinite(value as number));
          if (ratios.length === 0) return undefined;
          const avg = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
          return Math.max(1.1, Math.min(avg, 2.5));
        })()
      : undefined;

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % imageCount);
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + imageCount) % imageCount);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, imageCount]);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const nextImage = () => {
    setActiveIndex((prev) => (prev + 1) % imageCount);
  };

  const prevImage = () => {
    setActiveIndex((prev) => (prev - 1 + imageCount) % imageCount);
  };

  const gridClass =
    imageCount === 1
      ? 'inline-flex'
      : imageCount === 2
        ? 'grid grid-cols-2 aspect-[4/3]'
        : 'grid grid-cols-2 grid-rows-2 aspect-[4/3]';

  return (
    <>
      <div
        className={`mt-3 ${gridClass} gap-2 rounded-xl overflow-hidden border border-border`}
        style={twoUpAspectRatio ? { aspectRatio: twoUpAspectRatio } : undefined}
      >
        {displayImages.map((image: any, index: number) => {
          const isLastWithOverlay = imageCount > 4 && index === 3;
          const isTall = imageCount === 3 && index === 0;
          const isSingle = imageCount === 1;
          const isTwo = imageCount === 2;
          const isThree = imageCount === 3;
          return (
            <button
              key={`${image?.thumb ?? image?.fullsize ?? 'image'}-${index}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openLightbox(index);
              }}
              className={`relative group overflow-hidden bg-black ${
                isTall ? 'row-span-2' : ''
              }`}
            >
              <img
                src={isGifUrl(image.fullsize) ? image.fullsize : image.thumb || image.fullsize}
                alt={image.alt || 'Post image'}
                className={`${isSingle ? 'w-auto max-w-full' : 'w-full'} ${
                  isTwo ? 'object-contain' : 'object-contain'
                } bg-black ${
                  isSingle
                    ? 'h-auto'
                    : isThree
                      ? 'h-full'
                      : 'aspect-[4/3]'
                }`}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              {isLastWithOverlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-2xl font-semibold">
                  +{remaining}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-none w-[95vw] h-[90vh] bg-black/95 border-none p-0 shadow-none flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={images[activeIndex]?.fullsize || images[activeIndex]?.thumb}
              alt={images[activeIndex]?.alt || 'Post image'}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
            <div className="absolute top-6 left-1/2 -translate-x-1/2 text-xs text-white/80">
              {activeIndex + 1} / {imageCount}
            </div>
            {imageCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const renderImagesEmbed = (embed: any) => {
  const images = embed?.images;
  if (!Array.isArray(images) || images.length === 0) return null;
  return <ImageGrid images={images} />;
};

const renderVideoEmbed = (embed: any) => {
  const video = embed;
  if (!video?.playlist && !video?.thumb) return null;
  const isGif = Boolean(video?.isGif);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      {video.playlist ? (
        isGif ? (
          <video autoPlay loop muted playsInline className="w-full h-auto object-contain bg-black" poster={video.thumb}>
            <source src={video.playlist} />
          </video>
        ) : (
          <VideoPlayer src={video.playlist} poster={video.thumb} />
        )
      ) : (
        <img src={video.thumb} alt="Video thumbnail" className="w-full max-h-96 object-cover" />
      )}
    </div>
  );
};

const renderRecordEmbed = (embed: any) => {
  const record = embed?.record;
  if (!record) return null;
  const author = record.author;
  const text = record.value?.text;
  return (
    <div className="mt-3 rounded-xl border border-border p-3 bg-muted/20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          {author?.displayName || author?.handle || 'Post'}
        </span>
        {author?.handle && <span>@{author.handle}</span>}
      </div>
      {text && <p className="text-sm text-foreground mt-2 line-clamp-3">{text}</p>}
    </div>
  );
};

const renderEmbed = (embed?: any) => {
  if (!embed) return null;
  const type = embed.$type || '';

  if (type.includes('app.bsky.embed.images')) {
    return renderImagesEmbed(embed);
  }
  if (type.includes('app.bsky.embed.external')) {
    return renderExternalEmbed(embed);
  }
  if (type.includes('app.bsky.embed.video')) {
    return renderVideoEmbed(embed);
  }
  if (type.includes('app.bsky.embed.recordWithMedia')) {
    return (
      <>
        {renderEmbed(embed.media)}
        {renderRecordEmbed(embed.record)}
      </>
    );
  }
  if (type.includes('app.bsky.embed.record')) {
    return renderRecordEmbed(embed);
  }

  return null;
};

function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTime = () => setCurrentTime(video.currentTime);
    const handleDuration = () => setDuration(video.duration || 0);

    video.addEventListener('timeupdate', handleTime);
    video.addEventListener('loadedmetadata', handleDuration);
    return () => {
      video.removeEventListener('timeupdate', handleTime);
      video.removeEventListener('loadedmetadata', handleDuration);
    };
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      video.requestFullscreen?.().catch(() => undefined);
    }
  };

  const scrub = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  };

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return '0:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsHovered(true);
    video.muted = true;
    setIsMuted(true);
    if (video.paused) {
      video.play().catch(() => undefined);
    }
  };

  const handleMouseLeave = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsHovered(false);
    video.pause();
  };

  return (
    <div
      className="relative bg-black"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full max-h-96 bg-black"
        onClick={toggleMute}
      >
        <source src={src} />
      </video>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center gap-3 text-xs text-white">
          <button
            type="button"
            onClick={toggleMute}
            className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM5 9v6h4l5 5V4l-5 5H5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M5 9v6h4l5 5V4l-5 5H5zm11 3a4 4 0 0 0-2-3.46v6.92A4 4 0 0 0 16 12zm-2-7.74v2.06A6 6 0 0 1 20 12a6 6 0 0 1-6 5.68v2.06A8 8 0 0 0 22 12a8 8 0 0 0-8-7.74z" />
              </svg>
            )}
          </button>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(event) => scrub(Number(event.target.value))}
              className="w-full accent-white"
            />
            <span className="tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            aria-label="Fullscreen"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm0-4h2V7h3V5H5v5zm10 7h-3v2h5v-5h-2v3zm-3-9h3v3h2V5h-5v2z" />
            </svg>
          </button>
        </div>
      </div>
      {isHovered && (
        <div className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full bg-black/60 text-white">
          Hover preview (muted)
        </div>
      )}
    </div>
  );
}

export function PostCard({
  post,
  isSaved,
  onToggleSave,
}: {
  post: FeedPost;
  isSaved: boolean;
  onToggleSave: (post: FeedPost) => void;
}) {
  const navigate = useNavigate();
  const timeAgo = (dateString: string) => {
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

  const tags = extractTags(post.record.text);
  const handle = post.author.handle;
  const postId = post.uri.split('/').pop() ?? '';

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    if (!handle || !postId) return;
    navigate(`/profile/${handle}/post/${postId}`);
  };

  return (
    <article
      className="p-4 border-b border-border hover:bg-muted/30 transition-colors duration-200"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') handleCardClick(event as unknown as React.MouseEvent<HTMLDivElement>);
      }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Link to={`/profile/${post.author.handle}`} className="shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-muted">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.displayName || post.author.handle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {post.author.handle[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-foreground truncate">
              {post.author.displayName || post.author.handle}
            </span>
            <span className="text-muted-foreground text-sm truncate">@{post.author.handle}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <time className="text-muted-foreground text-sm shrink-0">
              {timeAgo(post.record.createdAt)}
            </time>
          </div>

          {/* Post text */}
          <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {renderTextWithTags(post.record.text)}
          </p>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/hashtag/${tag}`}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {renderEmbed(post.embed)}

          {/* Actions */}
          <div className="flex items-center gap-6 -ml-2 mt-3">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">{post.replyCount || ''}</span>
            </button>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-success transition-colors p-2 rounded-full hover:bg-success/10">
              <Repeat2 className="w-4 h-4" />
              <span className="text-sm">{post.repostCount || ''}</span>
            </button>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full hover:bg-destructive/10">
              <Heart className="w-4 h-4" />
              <span className="text-sm">{post.likeCount || ''}</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleSave(post)}
              className={`flex items-center gap-2 p-2 rounded-full transition-colors ${
                isSaved
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
              <span className="text-sm">{isSaved ? 'Saved' : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
