import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Smile } from 'lucide-react';

interface MessageComposerProps {
  onSend: (text: string) => void;
  isSending: boolean;
}

interface EmojiNinjaItem {
  character: string;
  code: string;
  name: string;
  group: string;
  subgroup: string;
  image?: string;
}

const EMOJI_API_BASE = 'https://api.api-ninjas.com/v1/emoji';
const EMOJI_PAGE_SIZE = 30;
const EMOJI_GROUPS = [
  { value: 'smileys_emotion', label: 'Smileys' },
  { value: 'people_body', label: 'People' },
  { value: 'component', label: 'Component' },
  { value: 'animals_nature', label: 'Animals' },
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'travel_places', label: 'Travel' },
  { value: 'activities', label: 'Activities' },
  { value: 'objects', label: 'Objects' },
  { value: 'symbols', label: 'Symbols' },
  { value: 'flags', label: 'Flags' },
];

export function MessageComposer({ onSend, isSending }: MessageComposerProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');
  const [emojiGroup, setEmojiGroup] = useState(EMOJI_GROUPS[0].value);
  const [emojiResults, setEmojiResults] = useState<EmojiNinjaItem[]>([]);
  const [isEmojiLoading, setIsEmojiLoading] = useState(false);
  const [emojiError, setEmojiError] = useState<string | null>(null);
  const [emojiOffset, setEmojiOffset] = useState(0);
  const [emojiHasMore, setEmojiHasMore] = useState(false);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) {
      setText((prev) => prev + emoji);
      return;
    }
    const target = inputRef.current;
    const start = target.selectionStart ?? text.length;
    const end = target.selectionEnd ?? text.length;
    const nextValue = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    setText(nextValue);
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const fetchEmojis = async (nextOffset: number, append: boolean) => {
    const apiKey = import.meta.env.VITE_API_NINJAS_KEY;
    if (!apiKey) {
      setEmojiError('Missing VITE_API_NINJAS_KEY.');
      return;
    }
    setIsEmojiLoading(true);
    setEmojiError(null);
    try {
      const params = new URLSearchParams();
      if (emojiQuery.trim()) {
        params.set('name', emojiQuery.trim());
      } else {
        params.set('group', emojiGroup);
      }
      params.set('offset', String(nextOffset));
      const response = await fetch(`${EMOJI_API_BASE}?${params.toString()}`, {
        headers: {
          'X-Api-Key': apiKey,
        },
      });
      if (!response.ok) {
        throw new Error('Emoji API request failed');
      }
      const data = (await response.json()) as EmojiNinjaItem[];
      const normalized = Array.isArray(data) ? data.filter((item) => item?.character) : [];
      setEmojiResults((prev) => (append ? [...prev, ...normalized] : normalized));
      setEmojiHasMore(normalized.length >= EMOJI_PAGE_SIZE);
    } catch {
      setEmojiError('Failed to load emojis.');
    } finally {
      setIsEmojiLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmojiOpen) return;
    const timeout = window.setTimeout(() => {
      setEmojiOffset(0);
      fetchEmojis(0, false);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [emojiQuery, emojiGroup, isEmojiOpen]);

  return (
    <div className="bg-background/95 px-6 py-4 backdrop-blur-lg">
      <div className="flex w-full min-h-[44px] items-center gap-2 rounded-full border border-transparent bg-muted/30 px-5 py-2 focus-within:border-primary/50 focus-within:bg-muted/50 transition-colors overflow-hidden">
        <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-3">
              <Input
                value={emojiQuery}
                onChange={(event) => setEmojiQuery(event.target.value)}
                placeholder="Search emojis"
                className="h-8 text-xs"
              />
              <select
                value={emojiGroup}
                onChange={(event) => setEmojiGroup(event.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {EMOJI_GROUPS.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
              {isEmojiLoading && emojiResults.length === 0 ? (
                <p className="text-xs text-muted-foreground">Loading emojis...</p>
              ) : emojiError ? (
                <p className="text-xs text-destructive">{emojiError}</p>
              ) : emojiResults.length === 0 ? (
                <p className="text-xs text-muted-foreground">No emojis found.</p>
              ) : (
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                  {emojiResults.map((item) => (
                    <button
                      key={`${item.code}-${item.character}`}
                      type="button"
                      className="h-8 w-8 rounded-lg hover:bg-muted/60 text-lg"
                      onClick={() => insertEmoji(item.character)}
                      title={item.name}
                    >
                      {item.character}
                    </button>
                  ))}
                </div>
              )}
              {emojiHasMore && !emojiError && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const next = emojiOffset + EMOJI_PAGE_SIZE;
                    setEmojiOffset(next);
                    fetchEmojis(next, true);
                  }}
                  disabled={isEmojiLoading}
                >
                  {isEmojiLoading ? 'Loading...' : 'Load more'}
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          className="h-[32px] flex-1 bg-transparent border-0 shadow-none px-0 py-0 text-sm leading-5 focus-visible:ring-0 focus:border-transparent focus:outline-none focus-visible:outline-none"
          disabled={isSending}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !text.trim()}
          aria-label="Send message"
          className="text-primary disabled:text-muted-foreground transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
