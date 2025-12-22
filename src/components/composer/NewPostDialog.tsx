import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Video, SmilePlus, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { atprotoClient } from '@/lib/atproto';

interface ImageAttachment {
  file: File;
  previewUrl: string;
  isGif?: boolean;
  aspectRatio?: { width: number; height: number };
}

interface VideoAttachment {
  file: File;
  previewUrl: string;
  aspectRatio?: { width: number; height: number };
}

const emojiOptions = ['😀', '😅', '😂', '😍', '😎', '🤝', '🙌', '🎉', '💡', '🔥', '✨', '💬'];

const languageOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'sw', label: 'Swahili' },
  { value: 'rw', label: 'Kinyarwanda' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
];

const MAX_CHARS = 300;
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'dc6zaTOxFJmzC';
const DEFAULTS_KEY = 'hillside_post_defaults';

type ReplySetting = 'anyone' | 'nobody' | 'followers' | 'following' | 'mentioned' | 'list';

interface InteractionDefaults {
  replySetting: ReplySetting;
  allowQuotePosts: boolean;
  listUris: string[];
}

const defaultInteraction: InteractionDefaults = {
  replySetting: 'anyone',
  allowQuotePosts: true,
  listUris: [],
};

const loadImageDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = URL.createObjectURL(file);
  });

const loadVideoDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth || 1, height: video.videoHeight || 1 });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => resolve({ width: 1, height: 1 });
    video.src = URL.createObjectURL(file);
  });

export function NewPostDialog({ trigger }: { trigger: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [video, setVideo] = useState<VideoAttachment | null>(null);
  const [language, setLanguage] = useState('auto');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; preview: string; original: string }>>([]);
  const [isGifLoading, setIsGifLoading] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [replySetting, setReplySetting] = useState<ReplySetting>('anyone');
  const [allowQuotePosts, setAllowQuotePosts] = useState(true);
  const [listUris, setListUris] = useState<string[]>([]);
  const [lists, setLists] = useState<Array<{ uri: string; name: string }>>([]);
  const [isListsLoading, setIsListsLoading] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const remainingChars = useMemo(() => MAX_CHARS - text.length, [text.length]);
  const canSubmit = (text.trim().length > 0 || images.length > 0 || video) && remainingChars >= 0;

  useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem(DEFAULTS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as InteractionDefaults;
        setReplySetting(parsed.replySetting || 'anyone');
        setAllowQuotePosts(parsed.allowQuotePosts ?? true);
        setListUris(parsed.listUris || []);
      } catch {
        setReplySetting('anyone');
        setAllowQuotePosts(true);
        setListUris([]);
      }
    } else {
      setReplySetting(defaultInteraction.replySetting);
      setAllowQuotePosts(defaultInteraction.allowQuotePosts);
      setListUris(defaultInteraction.listUris);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!user?.did && !user?.handle) return;
    setIsListsLoading(true);
    setListsError(null);
    atprotoClient
      .getActorLists(user?.did || user?.handle || '')
      .then((result) => {
        if (result.success && result.data) {
          setLists(
            result.data.map((list: any) => ({
              uri: list.uri,
              name: list.name || list.displayName || 'List',
            }))
          );
        } else {
          setLists([]);
        }
      })
      .catch(() => setListsError('Failed to load lists.'))
      .finally(() => setIsListsLoading(false));
  }, [open, user?.did, user?.handle]);

  const insertEmoji = (emoji: string) => {
    const target = textareaRef.current;
    if (!target) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = target.selectionStart ?? text.length;
    const end = target.selectionEnd ?? text.length;
    const nextValue = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    setText(nextValue);
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const handleSelectImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setError(null);
    setVideo(null);

    const limited = files.slice(0, 4 - images.length);
    const nextAttachments: ImageAttachment[] = [];
    for (const file of limited) {
      if (!file.type.startsWith('image/')) continue;
      const previewUrl = URL.createObjectURL(file);
      const { width, height } = await loadImageDimensions(file);
      nextAttachments.push({ file, previewUrl, aspectRatio: { width, height } });
    }
    setImages((prev) => [...prev, ...nextAttachments].slice(0, 4));
    event.target.value = '';
  };

  const fetchGifs = async (query?: string) => {
    if (!GIPHY_API_KEY) {
      setGifError('Add VITE_GIPHY_API_KEY to enable GIF search.');
      return;
    }
    setGifError(null);
    setIsGifLoading(true);
    try {
      const endpoint = query?.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
            query
          )}&limit=24&rating=pg`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg`;
      const response = await fetch(endpoint);
      const data = await response.json();
      const gifs = (data?.data || []).map((gif: any) => ({
        id: gif.id,
        preview: gif.images?.fixed_width_small?.url || gif.images?.fixed_width?.url,
        original: gif.images?.original?.url,
      }));
      setGifResults(gifs.filter((gif: any) => gif.preview && gif.original));
    } catch (err) {
      setGifError('Failed to load GIFs.');
    } finally {
      setIsGifLoading(false);
    }
  };

  const addGifFromUrl = async (gif: { id: string; original: string }) => {
    if (images.length >= 4) return;
    setError(null);
    setVideo(null);
    try {
      const response = await fetch(gif.original);
      const blob = await response.blob();
      const file = new File([blob], `gif-${gif.id}.gif`, { type: blob.type || 'image/gif' });
      const previewUrl = URL.createObjectURL(file);
      const { width, height } = await loadImageDimensions(file);
      setImages((prev) => [
        ...prev,
        { file, previewUrl, aspectRatio: { width, height }, isGif: true },
      ]);
    } catch (err) {
      setError('Failed to add GIF.');
    }
  };

  const handleSelectVideo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setImages([]);
    const previewUrl = URL.createObjectURL(file);
    const { width, height } = await loadVideoDimensions(file);
    setVideo({ file, previewUrl, aspectRatio: { width, height } });
    event.target.value = '';
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await atprotoClient.createPost({
        text,
        langs: language === 'auto' ? undefined : [language],
        images:
          images.length > 0
            ? images.map((image) => ({
                file: image.file,
                aspectRatio: image.aspectRatio,
              }))
            : undefined,
        video: video
          ? {
              file: video.file,
              aspectRatio: video.aspectRatio,
            }
          : undefined,
        interaction: {
          reply: replySetting,
          allowQuotePosts,
          listUris,
        },
      });

      if (!result.success) {
        setError(result.error || 'Failed to post.');
        return;
      }

      setText('');
      setImages([]);
      setVideo(null);
      setGifQuery('');
      setGifResults([]);
      setOpen(false);
    } catch (err) {
      setError('Failed to post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDefaults = () => {
    const payload: InteractionDefaults = {
      replySetting,
      allowQuotePosts,
      listUris,
    };
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(payload));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center justify-between gap-4 pr-10">
            <DialogTitle>New post</DialogTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setInteractionOpen(true)}>
              Post interaction settings
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.displayName || user.handle} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  {user?.handle?.[0]?.toUpperCase() ?? 'H'}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="What's happening?"
                maxLength={MAX_CHARS}
                className="min-h-[140px] text-base"
              />
              <div className="flex items-center flex-wrap gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleSelectImages}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleSelectVideo}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={Boolean(video) || images.length >= 4}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Images
                </Button>
                <Popover onOpenChange={(open) => open && fetchGifs(gifQuery)}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={Boolean(video) || images.length >= 4}>
                      <span className="mr-2 text-base">GIF</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-3">
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          fetchGifs(gifQuery);
                        }}
                        className="flex gap-2"
                      >
                        <Input
                          value={gifQuery}
                          onChange={(event) => setGifQuery(event.target.value)}
                          placeholder="Search GIFs"
                        />
                        <Button type="submit" size="sm">
                          Search
                        </Button>
                      </form>
                      {gifError && <p className="text-xs text-destructive">{gifError}</p>}
                      {isGifLoading ? (
                        <p className="text-xs text-muted-foreground">Loading GIFs...</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                          {gifResults.map((gif) => (
                            <button
                              key={gif.id}
                              type="button"
                              onClick={() => addGifFromUrl(gif)}
                              className="rounded-md overflow-hidden border border-border"
                            >
                              <img src={gif.preview} alt="GIF preview" className="w-full h-20 object-cover" />
                            </button>
                          ))}
                          {!gifResults.length && !gifError && (
                            <p className="col-span-3 text-xs text-muted-foreground">No GIFs found.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={images.length > 0 || Boolean(video)}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <SmilePlus className="w-4 h-4 mr-2" />
                      Emoji
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="grid grid-cols-6 gap-2">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="text-xl"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className={`ml-auto text-sm ${remainingChars < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {remainingChars}
                </span>
              </div>
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((image, index) => (
                <div key={image.previewUrl} className="relative rounded-xl overflow-hidden border border-border">
                  <img src={image.previewUrl} alt={`Upload ${index + 1}`} className="w-full h-40 object-cover" />
                  {image.isGif && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                      GIF
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((item) => item.previewUrl !== image.previewUrl))}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {video && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <video src={video.previewUrl} className="w-full max-h-80 object-cover" muted controls />
              <button
                type="button"
                onClick={() => setVideo(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Post interaction settings</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">These are your default settings.</p>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Who can reply
                  </label>
                  <Select value={replySetting} onValueChange={(value) => setReplySetting(value as ReplySetting)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Who can reply" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anyone">Anyone</SelectItem>
                      <SelectItem value="nobody">Nobody</SelectItem>
                      <SelectItem value="followers">Your followers</SelectItem>
                      <SelectItem value="following">People you follow</SelectItem>
                      <SelectItem value="mentioned">People you mention</SelectItem>
                      <SelectItem value="list">Select from your lists</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {replySetting === 'list' && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Select from your lists
                    </p>
                    {listsError && <p className="text-xs text-destructive">{listsError}</p>}
                    {isListsLoading ? (
                      <p className="text-xs text-muted-foreground">Loading lists...</p>
                    ) : lists.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No lists available.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {lists.map((list) => {
                          const checked = listUris.includes(list.uri);
                          return (
                            <label key={list.uri} className="flex items-center gap-2 text-sm text-foreground">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  setListUris((prev) => {
                                    if (value) {
                                      return prev.includes(list.uri) ? prev : [...prev, list.uri];
                                    }
                                    return prev.filter((uri) => uri !== list.uri);
                                  });
                                }}
                              />
                              {list.name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Allow quote posts</p>
                    <p className="text-xs text-muted-foreground">Control if others can quote this post</p>
                  </div>
                  <Switch checked={allowQuotePosts} onCheckedChange={setAllowQuotePosts} />
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={handleSaveDefaults}>
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              300 characters · Bluesky embeds supported
            </p>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
