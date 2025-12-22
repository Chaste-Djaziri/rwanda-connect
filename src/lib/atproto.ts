import { BskyAgent, AtpSessionData, AtpSessionEvent } from '@atproto/api';

const PUBLIC_API = 'https://public.api.bsky.app';
const BSKY_SERVICE = 'https://bsky.social';

class ATProtoClient {
  private agent: BskyAgent;
  private session: AtpSessionData | null = null;

  constructor() {
    this.agent = new BskyAgent({
      service: BSKY_SERVICE,
      persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
        if (evt === 'create' || evt === 'update') {
          this.session = sess || null;
          if (sess) {
            localStorage.setItem('atproto_session', JSON.stringify(sess));
          }
        } else if (evt === 'expired') {
          this.session = null;
          localStorage.removeItem('atproto_session');
        }
      },
    });
  }

  async resumeSession(): Promise<boolean> {
    try {
      const stored = localStorage.getItem('atproto_session');
      if (!stored) return false;
      
      const sessionData: AtpSessionData = JSON.parse(stored);
      await this.agent.resumeSession(sessionData);
      this.session = sessionData;
      return true;
    } catch (error) {
      console.error('Failed to resume session:', error);
      localStorage.removeItem('atproto_session');
      return false;
    }
  }

  async login(identifier: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.agent.login({
        identifier: identifier.startsWith('@') ? identifier.slice(1) : identifier,
        password,
      });
      
      if (response.success) {
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.status === 401) {
        return { success: false, error: 'Invalid handle or password. Please check your credentials.' };
      }
      if (error.status === 400) {
        return { success: false, error: 'Invalid request. Please check your handle format.' };
      }
      if (error.message?.includes('network')) {
        return { success: false, error: 'Network error. Please check your connection.' };
      }
      
      return { success: false, error: error.message || 'Authentication failed. Please try again.' };
    }
  }

  async logout(): Promise<void> {
    this.session = null;
    localStorage.removeItem('atproto_session');
  }

  isAuthenticated(): boolean {
    return this.agent.hasSession;
  }

  getSession(): AtpSessionData | null {
    return this.session;
  }

  getDid(): string | undefined {
    return this.agent.session?.did;
  }

  getHandle(): string | undefined {
    return this.agent.session?.handle;
  }

  async getProfile(actor?: string) {
    try {
      const targetActor = actor || this.getDid();
      if (!targetActor) throw new Error('No actor specified');
      
      const response = await this.agent.getProfile({ actor: targetActor });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Get profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTimeline(cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.getTimeline({ cursor, limit });
      return { 
        success: true, 
        data: response.data.feed,
        cursor: response.data.cursor 
      };
    } catch (error: any) {
      console.error('Get timeline error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
export const atprotoClient = new ATProtoClient();
