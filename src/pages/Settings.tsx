import { AppLayout } from '@/components/layout/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun, Palette, Globe, Shield, User, LogOut, ChevronRight } from 'lucide-react';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="border-b border-border">
      <h2 className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

function SettingsRow({ icon, label, description, action, onClick }: SettingsRowProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      className={`w-full px-4 py-4 flex items-center gap-4 ${
        onClick ? 'hover:bg-muted/30 transition-colors cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-foreground">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onClick && !action && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
    </Wrapper>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 surface-elevated border-b border-border backdrop-blur-lg bg-background/80">
        <div className="px-4 h-14 flex items-center">
          <h1 className="font-semibold text-foreground text-lg">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="animate-fade-in">
        {/* Account Section */}
        <SettingsSection title="Account">
          <SettingsRow
            icon={<User className="w-5 h-5 text-primary" />}
            label={user?.displayName || user?.handle || 'Account'}
            description={user?.handle ? `@${user.handle}` : 'Manage your account'}
          />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title="Appearance">
          <SettingsRow
            icon={
              theme === 'dark' ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )
            }
            label="Dark Mode"
            description={theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
            action={<Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />}
          />
          <SettingsRow
            icon={<Palette className="w-5 h-5 text-primary" />}
            label="Theme Color"
            description="Deep Green (Default)"
          />
        </SettingsSection>

        {/* Preferences Section - Future-proof placeholders */}
        <SettingsSection title="Preferences">
          <SettingsRow
            icon={<Globe className="w-5 h-5 text-primary" />}
            label="Language"
            description="English (Coming soon)"
          />
          <SettingsRow
            icon={<Shield className="w-5 h-5 text-primary" />}
            label="Privacy"
            description="Manage your privacy settings (Coming soon)"
          />
        </SettingsSection>

        {/* Session Section */}
        <SettingsSection title="Session">
          <SettingsRow
            icon={<LogOut className="w-5 h-5 text-destructive" />}
            label="Sign Out"
            description="Sign out of your account"
            onClick={handleLogout}
          />
        </SettingsSection>

        {/* App Info */}
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Imvura v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">Built on AT Protocol</p>
          <p className="text-xs text-muted-foreground mt-4">
            © 2024 Imvura · Rwanda
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
