import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Smile } from 'lucide-react';

interface MessageComposerProps {
  onSend: (text: string) => void;
  isSending: boolean;
}

interface EmojiFamilyItem {
  emoji: string;
  hexcode: string;
  annotation: string;
  group: string;
  subgroup: string;
  tags?: string[];
  shortcodes?: string[];
}

const EMOJI_API_BASE = '/api/emoji';

export function MessageComposer({ onSend, isSending }: MessageComposerProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');
  const [emojiResults, setEmojiResults] = useState<EmojiFamilyItem[]>([]);
  const [isEmojiLoading, setIsEmojiLoading] = useState(false);
  const [emojiError, setEmojiError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isEmojiOpen) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsEmojiLoading(true);
      setEmojiError(null);
      try {
        const params = new URLSearchParams();
        if (emojiQuery.trim()) {
          params.set('search', emojiQuery.trim());
        } else {
          params.set('group', 'smileys-emotion');
        }
        params.set('includeVariations', 'true');
        const response = await fetch(`${EMOJI_API_BASE}/emojis?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Emoji API request failed');
        }
        const data = (await response.json()) as EmojiFamilyItem[];
        setEmojiResults(Array.isArray(data) ? data.filter((item) => item?.emoji) : []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setEmojiError('Failed to load emojis.');
        }
      } finally {
        setIsEmojiLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [emojiQuery, isEmojiOpen]);

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
              {isEmojiLoading ? (
                <p className="text-xs text-muted-foreground">Loading emojis...</p>
              ) : emojiError ? (
                <p className="text-xs text-destructive">{emojiError}</p>
              ) : emojiResults.length === 0 ? (
                <p className="text-xs text-muted-foreground">No emojis found.</p>
              ) : (
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                  {emojiResults.map((item) => (
                    <button
                      key={`${item.hexcode}-${item.emoji}`}
                      type="button"
                      className="h-8 w-8 rounded-lg hover:bg-muted/60 text-lg"
                      onClick={() => insertEmoji(item.emoji)}
                      title={item.annotation}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
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
