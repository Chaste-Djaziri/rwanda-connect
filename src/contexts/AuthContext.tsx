import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { atprotoClient } from '@/lib/atproto';

interface User {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!atprotoClient.isAuthenticated()) {
      setUser(null);
      return;
    }

    try {
      const profileResult = await atprotoClient.getProfile();
      if (profileResult.success && profileResult.data) {
        setUser({
          did: profileResult.data.did,
          handle: profileResult.data.handle,
          displayName: profileResult.data.displayName,
          avatar: profileResult.data.avatar,
        });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const resumed = await atprotoClient.resumeSession();
        if (resumed) {
          await refreshUser();
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshUser]);

  const login = async (identifier: string, password: string) => {
    const result = await atprotoClient.login(identifier, password);
    if (result.success) {
      await refreshUser();
    }
    return result;
  };

  const logout = async () => {
    await atprotoClient.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
