import { AppLayout } from '@/components/layout/AppLayout';

export default function FeedsPage() {
  return (
    <AppLayout>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 flex items-center">
          <h1 className="font-semibold text-foreground text-lg">Feeds</h1>
        </div>
      </header>
      <div className="p-10 text-center text-muted-foreground">
        <p className="text-sm">Feeds will appear here.</p>
        <p className="text-xs mt-2">Connect to a feed generator to get started.</p>
      </div>
    </AppLayout>
  );
}
