import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Lock, AtSign } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  identifier: z.string()
    .min(1, 'Handle is required')
    .max(253, 'Handle is too long')
    .refine(
      (val) => /^[a-zA-Z0-9._-]+(\.[a-zA-Z0-9._-]+)*$/.test(val.replace('@', '')),
      'Invalid handle format'
    ),
  password: z.string()
    .min(1, 'Password is required')
    .max(256, 'Password is too long'),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(identifier, password);
      if (result.success) {
        navigate('/feed', { replace: true });
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--foreground)) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo and Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-6">
              <svg 
                viewBox="0 0 24 24" 
                className="w-8 h-8 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Hillside
            </h1>
            <p className="text-muted-foreground">
              A modern, decentralized social platform
            </p>
          </div>

          {/* Login Form */}
          <div className="surface-elevated rounded-2xl p-8 shadow-card border border-border/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium text-foreground">
                  Bluesky Handle
                </label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="yourhandle.bsky.social"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-11"
                    disabled={isLoading}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  App Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Create an app password at{' '}
                  <a 
                    href="https://bsky.app/settings/app-passwords" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    bsky.app/settings
                  </a>
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in with Bluesky'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Don't have a Bluesky account?{' '}
                <a 
                  href="https://bsky.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Create one at bsky.app
                </a>
              </p>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Powered by the AT Protocol
          </p>
        </div>
      </main>
    </div>
  );
}
