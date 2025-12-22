import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Heart, Repeat2, Bookmark } from 'lucide-react';

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

const renderExternalEmbed = (embed: any) => {
  const external = embed?.external;
  if (!external) return null;
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

const renderImagesEmbed = (embed: any) => {
  const images = embed?.images;
  if (!Array.isArray(images)) return null;
  return (
    <div className="mt-3 grid gap-2 rounded-xl overflow-hidden border border-border">
      {images.map((image: any, index: number) => (
        <img
          key={`${image?.thumb ?? 'image'}-${index}`}
          src={image.thumb || image.fullsize}
          alt={image.alt || 'Post image'}
          className="w-full max-h-96 object-cover"
        />
      ))}
    </div>
  );
};

const renderVideoEmbed = (embed: any) => {
  const video = embed;
  if (!video?.playlist && !video?.thumb) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      {video.playlist ? (
        <VideoPlayer src={video.playlist} poster={video.thumb} />
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTime = () => setCurrentTime(video.currentTime);
    const handleDuration = () => setDuration(video.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTime);
    video.addEventListener('loadedmetadata', handleDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTime);
      video.removeEventListener('loadedmetadata', handleDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

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
        onClick={togglePlay}
      >
        <source src={src} />
      </video>
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play video"
        >
          <div className="h-14 w-14 rounded-full bg-black/60 flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center gap-3 text-xs text-white">
          <button
            type="button"
            onClick={togglePlay}
            className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
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

  return (
    <article className="p-4 border-b border-border hover:bg-muted/30 transition-colors duration-200">
      <div className="flex gap-3">
        {/* Avatar */}
        <Link to={`/profile`} className="shrink-0">
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
