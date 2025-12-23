import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { atprotoClient } from '@/lib/atproto';
import { chatApi } from '@/lib/chat';

interface User {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasChatSession: boolean;
  isChatSessionLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  initChatSession: (identifier: string, password: string) => Promise<boolean>;
  switchAccount: (session: AtpSessionData) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChatSession, setHasChatSession] = useState(false);
  const [isChatSessionLoading, setIsChatSessionLoading] = useState(false);

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
          verified: profileResult.data.verification?.verifiedStatus === 'valid',
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
          setIsChatSessionLoading(true);
          try {
            const sessionData = atprotoClient.getSession();
            if (sessionData) {
              await chatApi.restoreSession(sessionData);
              setHasChatSession(true);
            } else {
              setHasChatSession(false);
            }
          } catch {
            setHasChatSession(false);
          } finally {
            setIsChatSessionLoading(false);
          }
        } else {
          const storedSession = atprotoClient.getStoredSession();
          if (storedSession) {
            setUser({
              did: storedSession.did,
              handle: storedSession.handle,
            });
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshUser]);

  const initChatSession = useCallback(async (identifier: string, password: string) => {
    setIsChatSessionLoading(true);
    try {
      await chatApi.createSession(identifier, password);
      setHasChatSession(true);
      return true;
    } catch (error) {
      console.error('Chat session error:', error);
      setHasChatSession(false);
      return false;
    } finally {
      setIsChatSessionLoading(false);
    }
  }, []);

  const switchAccount = useCallback(
    async (session: AtpSessionData) => {
      setIsChatSessionLoading(true);
      try {
        const ok = await atprotoClient.switchSession(session);
        if (!ok) return false;
        await refreshUser();
        try {
          await chatApi.restoreSession(session);
          setHasChatSession(true);
        } catch {
          setHasChatSession(false);
        }
        return true;
      } catch (error) {
        console.error('Switch account error:', error);
        return false;
      } finally {
        setIsChatSessionLoading(false);
      }
    },
    [refreshUser]
  );

  const login = async (identifier: string, password: string) => {
    const result = await atprotoClient.login(identifier, password);
    if (result.success) {
      await refreshUser();
      await initChatSession(identifier, password);
    }
    return result;
  };

  const logout = async () => {
    await atprotoClient.logout();
    setUser(null);
    setHasChatSession(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasChatSession,
        isChatSessionLoading,
        login,
        logout,
        refreshUser,
        initChatSession,
        switchAccount,
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
