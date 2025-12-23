import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Shield, Globe, Users } from 'lucide-react';
import { usePageMeta } from '@/lib/seo';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  usePageMeta({
    title: 'Welcome',
    description:
      'HiiSide is a decentralized social platform built on the AT Protocol. Own your data, build community, and connect through an open network.',
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--foreground)) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo/dark-mode-logo.png"
              alt="HiiSide"
              className="h-auto w-auto max-h-8 max-w-8"
            />
            <span className="text-xl font-semibold text-foreground">HiiSide</span>
          </div>
          
          {!isLoading && (
            <Link to="/feed">
              <Button variant="outline" size="sm">
                {isAuthenticated ? "Go to Feed" : "View Feed"}
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Globe className="w-4 h-4" />
                Powered by AT Protocol
              </div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-foreground/10 text-foreground text-sm font-semibold">
                Made by Chaste Djaziri
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6">
              Your Voice,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Decentralized
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
              Join the next generation of social networking. Built on open protocols, 
              owned by the community. Your data, your voice, your platform.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/feed">
                <Button variant="brand" size="xl">
                  {isAuthenticated ? "Open Feed" : "Get Started"}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a 
                href="https://atproto.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="xl">
                  Learn about AT Protocol
                </Button>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="relative z-10 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl surface-elevated border border-border/50">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Own Your Identity
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your account is portable. Take your followers and data anywhere on the AT Protocol network.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl surface-elevated border border-border/50">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Open Protocol
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Built on AT Protocol. Interoperable, federated, and designed for the future of social networking.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl surface-elevated border border-border/50">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Community First
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Designed for open communities. A platform that respects user ownership and choice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 HiiSide. Built with AT Protocol.
          </p>
          <div className="flex items-center gap-6">
            <a 
              href="https://atproto.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              AT Protocol
            </a>
            <a 
              href="https://bsky.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Bluesky
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
