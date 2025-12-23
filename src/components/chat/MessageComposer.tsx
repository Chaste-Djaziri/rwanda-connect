import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Smile } from 'lucide-react';

interface MessageComposerProps {
  onSend: (text: string) => void;
  isSending: boolean;
}

export function MessageComposer({ onSend, isSending }: MessageComposerProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const emojiOptions = ['😀', '😅', '😂', '😍', '😎', '🤝', '🙌', '🎉', '💡', '🔥', '✨', '💬'];

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

  return (
    <div className="bg-background/95 px-6 py-4 backdrop-blur-lg">
      <div className="flex w-full min-h-[44px] items-center gap-2 rounded-full border border-transparent bg-muted/30 px-5 py-2 focus-within:border-primary/50 focus-within:bg-muted/50 transition-colors overflow-hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="grid grid-cols-6 gap-2">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="h-8 w-8 rounded-lg hover:bg-muted/60 text-lg"
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
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
