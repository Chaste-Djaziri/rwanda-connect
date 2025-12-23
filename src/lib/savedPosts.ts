export interface SavedPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    verified?: boolean;
  };
  record: {
    text: string;
    createdAt: string;
  };
  replyCount: number;
  repostCount: number;
  likeCount: number;
  embed?: any;
  viewer?: {
    like?: string;
    repost?: string;
  };
}

const STORAGE_KEY = 'saved_posts';

const readStored = (): SavedPost[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStored = (posts: SavedPost[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
};

export const getSavedPosts = (): SavedPost[] => readStored();

export const isPostSaved = (uri: string): boolean => {
  return readStored().some((post) => post.uri === uri);
};

export const savePost = (post: SavedPost) => {
  const existing = readStored();
  if (existing.some((item) => item.uri === post.uri)) return;
  writeStored([post, ...existing]);
};

export const removeSavedPost = (uri: string) => {
  const existing = readStored();
  writeStored(existing.filter((post) => post.uri !== uri));
};
