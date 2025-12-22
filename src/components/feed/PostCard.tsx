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
        <video controls poster={video.thumb} className="w-full max-h-96 bg-black">
          <source src={video.playlist} />
        </video>
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
