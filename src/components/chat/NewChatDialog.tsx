import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { chatApi, resolveHandleToDid } from '@/lib/chat';
import { useAuth } from '@/contexts/AuthContext';

export function NewChatDialog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveTargetDid = async (input: string) => {
    if (input.startsWith('did:')) {
      return input.trim();
    }
    return resolveHandleToDid(input);
  };

  const handleStart = async () => {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter a DID or handle.');
      return;
    }
    if (!user?.did) {
      setError('You must be signed in.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetDid = await resolveTargetDid(trimmed);
      const members = Array.from(new Set([user.did, targetDid]));
      const response = await chatApi.getConvoForMembers(members);
      setOpen(false);
      setValue('');
      navigate(`/chat/${response.convo.id}`);
    } catch (err: any) {
      setError(err?.message || 'Unable to start a new conversation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          New message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">DID or handle</label>
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="did:plc... or handle.bsky.social"
              className="mt-2"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter a DID for best results. Handles will be resolved via public lookup.
            </p>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start chat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
