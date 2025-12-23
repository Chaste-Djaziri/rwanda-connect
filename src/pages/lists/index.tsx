import { AppLayout } from '@/components/layout/AppLayout';
import { usePageMeta } from '@/lib/seo';

export default function ListsPage() {
  usePageMeta({
    title: 'Lists',
    description: 'Organize people into curated lists.',
  });
  return (
    <AppLayout>
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-6 h-14 flex items-center">
          <h1 className="font-semibold text-foreground text-lg">Lists</h1>
        </div>
      </header>
      <div className="p-10 text-center text-muted-foreground">
        <p className="text-sm">Lists will appear here.</p>
        <p className="text-xs mt-2">Create a list to organize people.</p>
      </div>
    </AppLayout>
  );
}
