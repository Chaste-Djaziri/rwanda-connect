import { BskyAgent, AtpSessionData, AtpSessionEvent, RichText } from '@atproto/api';

const PUBLIC_API = 'https://public.api.bsky.app';
const BSKY_SERVICE = 'https://bsky.social';
const SESSIONS_KEY = 'atproto_sessions';

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
            this.storeSession(sess);
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

  async switchSession(sessionData: AtpSessionData): Promise<boolean> {
    try {
      await this.agent.resumeSession(sessionData);
      this.session = sessionData;
      localStorage.setItem('atproto_session', JSON.stringify(sessionData));
      this.storeSession(sessionData);
      return true;
    } catch (error) {
      console.error('Failed to switch session:', error);
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

  getStoredSessions(): AtpSessionData[] {
    try {
      const stored = localStorage.getItem(SESSIONS_KEY);
      if (!stored) return [];
      const sessions = JSON.parse(stored) as AtpSessionData[];
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      console.error('Failed to read stored sessions:', error);
      return [];
    }
  }

  storeSession(sessionData: AtpSessionData) {
    const sessions = this.getStoredSessions();
    const existing = sessions.findIndex((sess) => sess.did === sessionData.did);
    if (existing >= 0) {
      sessions[existing] = sessionData;
    } else {
      sessions.unshift(sessionData);
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 10)));
  }

  removeStoredSession(did: string) {
    const sessions = this.getStoredSessions().filter((sess) => sess.did !== did);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
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

  async getProfilePublic(actor: string) {
    try {
      const response = await fetch(
        `${PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      console.error('Get profile public error:', error);
      return { success: false, error: error.message };
    }
  }

  async createPost({
    text,
    langs,
    images,
    video,
    interaction,
  }: {
    text: string;
    langs?: string[];
    images?: Array<{
      file: Blob;
      alt?: string;
      aspectRatio?: { width: number; height: number };
    }>;
    video?: {
      file: Blob;
      aspectRatio?: { width: number; height: number };
    };
    interaction?: {
      reply?: 'anyone' | 'nobody' | 'followers' | 'following' | 'mentioned' | 'list';
      listUris?: string[];
      allowQuotePosts?: boolean;
    };
  }) {
    try {
      const richText = new RichText({ text });
      await richText.detectFacets(this.agent);

      const record: any = {
        $type: 'app.bsky.feed.post',
        text: richText.text,
        facets: richText.facets,
        createdAt: new Date().toISOString(),
      };

      if (langs && langs.length > 0) {
        record.langs = langs;
      }

      if (images && images.length > 0) {
        const uploaded = await Promise.all(
          images.map(async (image) => {
            const response = await this.agent.uploadBlob(image.file, {
              encoding: image.file.type,
            });
            return {
              image: response.data.blob,
              alt: image.alt || '',
              ...(image.aspectRatio ? { aspectRatio: image.aspectRatio } : {}),
            };
          })
        );
        record.embed = {
          $type: 'app.bsky.embed.images',
          images: uploaded,
        };
      } else if (video) {
        const response = await this.agent.uploadBlob(video.file, {
          encoding: video.file.type,
        });
        record.embed = {
          $type: 'app.bsky.embed.video',
          video: response.data.blob,
          ...(video.aspectRatio ? { aspectRatio: video.aspectRatio } : {}),
        };
      }

      const response = await this.agent.post(record);
      const postUri = response.data?.uri;
      const repo = this.agent.session?.did;
      const rkey = postUri ? postUri.split('/').pop() : undefined;

      if (interaction && repo && rkey && postUri) {
        const allowQuotePosts = interaction.allowQuotePosts ?? true;
        const replySetting = interaction.reply ?? 'anyone';

        let allowRules:
          | Array<
              | { $type: 'app.bsky.feed.threadgate#mentionRule' }
              | { $type: 'app.bsky.feed.threadgate#followerRule' }
              | { $type: 'app.bsky.feed.threadgate#followingRule' }
              | { $type: 'app.bsky.feed.threadgate#listRule'; list: string }
            >
          | undefined;

        if (replySetting === 'nobody') {
          allowRules = [];
        } else if (replySetting === 'followers') {
          allowRules = [{ $type: 'app.bsky.feed.threadgate#followerRule' }];
        } else if (replySetting === 'following') {
          allowRules = [{ $type: 'app.bsky.feed.threadgate#followingRule' }];
        } else if (replySetting === 'mentioned') {
          allowRules = [{ $type: 'app.bsky.feed.threadgate#mentionRule' }];
        } else if (replySetting === 'list') {
          allowRules =
            interaction.listUris?.length && interaction.listUris.length > 0
              ? interaction.listUris.map((list) => ({
                  $type: 'app.bsky.feed.threadgate#listRule' as const,
                  list,
                }))
              : [];
        }

        if (replySetting !== 'anyone') {
          await this.agent.com.atproto.repo.createRecord({
            repo,
            collection: 'app.bsky.feed.threadgate',
            rkey,
            record: {
              $type: 'app.bsky.feed.threadgate',
              post: postUri,
              allow: allowRules,
              createdAt: new Date().toISOString(),
            },
          });
        }

        if (!allowQuotePosts) {
          await this.agent.com.atproto.repo.createRecord({
            repo,
            collection: 'app.bsky.feed.postgate',
            rkey,
            record: {
              $type: 'app.bsky.feed.postgate',
              post: postUri,
              embeddingRules: [{ $type: 'app.bsky.feed.postgate#disableRule' }],
              createdAt: new Date().toISOString(),
            },
          });
        }
      }

      if (!postUri) {
        return { success: false, error: 'Post created without a URI response.' };
      }
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Create post error:', error);
      return { success: false, error: error.message };
    }
  }

  async deletePost(uri: string) {
    try {
      const repo = this.agent.session?.did;
      if (!repo) throw new Error('No session');
      const parts = uri.split('/');
      const rkey = parts[parts.length - 1];
      await this.agent.com.atproto.repo.deleteRecord({
        repo,
        collection: 'app.bsky.feed.post',
        rkey,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Delete post error:', error);
      return { success: false, error: error.message };
    }
  }

  async muteActor(actor: string) {
    try {
      await this.agent.app.bsky.graph.muteActor({ actor });
      return { success: true };
    } catch (error: any) {
      console.error('Mute actor error:', error);
      return { success: false, error: error.message };
    }
  }

  async blockActor(actor: string) {
    try {
      const repo = this.agent.session?.did;
      if (!repo) throw new Error('No session');
      await this.agent.com.atproto.repo.createRecord({
        repo,
        collection: 'app.bsky.graph.block',
        record: {
          $type: 'app.bsky.graph.block',
          subject: actor,
          createdAt: new Date().toISOString(),
        },
      });
      return { success: true };
    } catch (error: any) {
      console.error('Block actor error:', error);
      return { success: false, error: error.message };
    }
  }

  async muteThread(uri: string) {
    try {
      await this.agent.app.bsky.graph.muteThread({ root: uri });
      return { success: true };
    } catch (error: any) {
      console.error('Mute thread error:', error);
      return { success: false, error: error.message };
    }
  }

  async reportPost(uri: string, cid: string, reason: string = 'Reported from Hillside') {
    try {
      await this.agent.com.atproto.moderation.createReport({
        reasonType: 'com.atproto.moderation.defs#reasonOther',
        reason,
        subject: {
          $type: 'com.atproto.repo.strongRef',
          uri,
          cid,
        },
      });
      return { success: true };
    } catch (error: any) {
      console.error('Report post error:', error);
      return { success: false, error: error.message };
    }
  }

  async updatePostInteraction({
    postUri,
    replySetting,
    listUris,
    allowQuotePosts,
  }: {
    postUri: string;
    replySetting: 'anyone' | 'nobody' | 'followers' | 'following' | 'mentioned' | 'list';
    listUris?: string[];
    allowQuotePosts: boolean;
  }) {
    try {
      const repo = this.agent.session?.did;
      if (!repo) throw new Error('No session');
      const rkey = postUri.split('/').pop();
      if (!rkey) throw new Error('Invalid post URI');

      let allowRules:
        | Array<
            | { $type: 'app.bsky.feed.threadgate#mentionRule' }
            | { $type: 'app.bsky.feed.threadgate#followerRule' }
            | { $type: 'app.bsky.feed.threadgate#followingRule' }
            | { $type: 'app.bsky.feed.threadgate#listRule'; list: string }
          >
        | undefined;

      if (replySetting === 'nobody') {
        allowRules = [];
      } else if (replySetting === 'followers') {
        allowRules = [{ $type: 'app.bsky.feed.threadgate#followerRule' }];
      } else if (replySetting === 'following') {
        allowRules = [{ $type: 'app.bsky.feed.threadgate#followingRule' }];
      } else if (replySetting === 'mentioned') {
        allowRules = [{ $type: 'app.bsky.feed.threadgate#mentionRule' }];
      } else if (replySetting === 'list') {
        allowRules =
          listUris?.length && listUris.length > 0
            ? listUris.map((list) => ({
                $type: 'app.bsky.feed.threadgate#listRule' as const,
                list,
              }))
            : [];
      }

      if (replySetting === 'anyone') {
        try {
          await this.agent.com.atproto.repo.deleteRecord({
            repo,
            collection: 'app.bsky.feed.threadgate',
            rkey,
          });
        } catch {
          // ignore missing threadgate
        }
      } else {
        await this.agent.com.atproto.repo.putRecord({
          repo,
          collection: 'app.bsky.feed.threadgate',
          rkey,
          record: {
            $type: 'app.bsky.feed.threadgate',
            post: postUri,
            allow: allowRules,
            createdAt: new Date().toISOString(),
          },
        });
      }

      if (!allowQuotePosts) {
        await this.agent.com.atproto.repo.putRecord({
          repo,
          collection: 'app.bsky.feed.postgate',
          rkey,
          record: {
            $type: 'app.bsky.feed.postgate',
            post: postUri,
            embeddingRules: [{ $type: 'app.bsky.feed.postgate#disableRule' }],
            createdAt: new Date().toISOString(),
          },
        });
      } else {
        try {
          await this.agent.com.atproto.repo.deleteRecord({
            repo,
            collection: 'app.bsky.feed.postgate',
            rkey,
          });
        } catch {
          // ignore missing postgate
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Update post interaction error:', error);
      return { success: false, error: error.message };
    }
  }

  async pinPostToProfile(postUri: string, postCid: string) {
    try {
      const repo = this.agent.session?.did;
      if (!repo) throw new Error('No session');
      const record = await this.agent.com.atproto.repo.getRecord({
        repo,
        collection: 'app.bsky.actor.profile',
        rkey: 'self',
      });
      const profile = record.data.value || {};
      const updated = {
        ...(profile as Record<string, unknown>),
        pinnedPost: {
          $type: 'com.atproto.repo.strongRef',
          uri: postUri,
          cid: postCid,
        },
      };
      await this.agent.com.atproto.repo.putRecord({
        repo,
        collection: 'app.bsky.actor.profile',
        rkey: 'self',
        record: {
          $type: 'app.bsky.actor.profile',
          ...updated,
        },
      });
      return { success: true };
    } catch (error: any) {
      console.error('Pin post error:', error);
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

  async getFeed(feed: string, cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.app.bsky.feed.getFeed({ feed, cursor, limit });
      return {
        success: true,
        data: response.data.feed,
        cursor: response.data.cursor,
      };
    } catch (error: any) {
      console.error('Get feed error:', error);
      return { success: false, error: error.message };
    }
  }

  async searchPostsByTag(tag: string, cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.app.bsky.feed.searchPosts({
        q: `#${tag}`,
        tag: [tag],
        cursor,
        limit,
      });
      return {
        success: true,
        data: response.data.posts,
        cursor: response.data.cursor,
      };
    } catch (error: any) {
      console.error('Search posts error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPostThread(uri: string, depth: number = 3, parentHeight: number = 2) {
    try {
      const response = await this.agent.app.bsky.feed.getPostThread({
        uri,
        depth,
        parentHeight,
      });
      return { success: true, data: response.data.thread };
    } catch (error: any) {
      console.error('Get post thread error:', error);
      return { success: false, error: error.message };
    }
  }

  async resolveHandle(handle: string) {
    try {
      const response = await this.agent.com.atproto.identity.resolveHandle({ handle });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Resolve handle error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAuthorFeed(
    actor: string,
    filter:
      | 'posts_with_replies'
      | 'posts_no_replies'
      | 'posts_with_media'
      | 'posts_with_video'
      | 'posts_and_author_threads',
    cursor?: string,
    limit: number = 30
  ) {
    try {
      const response = await this.agent.app.bsky.feed.getAuthorFeed({
        actor,
        filter,
        cursor,
        limit,
      });
      return { success: true, data: response.data.feed, cursor: response.data.cursor };
    } catch (error: any) {
      console.error('Get author feed error:', error);
      return { success: false, error: error.message };
    }
  }

  async getActorLikes(actor: string, cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.app.bsky.feed.getActorLikes({ actor, cursor, limit });
      return { success: true, data: response.data.feed, cursor: response.data.cursor };
    } catch (error: any) {
      console.error('Get actor likes error:', error);
      return { success: false, error: error.message };
    }
  }

  async getActorFeeds(actor: string, cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.app.bsky.feed.getActorFeeds({ actor, cursor, limit });
      return { success: true, data: response.data.feeds, cursor: response.data.cursor };
    } catch (error: any) {
      console.error('Get actor feeds error:', error);
      return { success: false, error: error.message };
    }
  }

  async getActorStarterPacks(actor: string, cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.app.bsky.graph.getActorStarterPacks({ actor, cursor, limit });
      return { success: true, data: response.data.starterPacks, cursor: response.data.cursor };
    } catch (error: any) {
      console.error('Get actor starter packs error:', error);
      return { success: false, error: error.message };
    }
  }

  async getActorLists(actor: string, cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.app.bsky.graph.getLists({ actor, cursor, limit });
      return { success: true, data: response.data.lists, cursor: response.data.cursor };
    } catch (error: any) {
      console.error('Get actor lists error:', error);
      return { success: false, error: error.message };
    }
  }

  // Fetch notifications using AT Protocol listNotifications endpoint
  async getNotifications(cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.listNotifications({ cursor, limit });
      return {
        success: true,
        data: response.data.notifications,
        cursor: response.data.cursor,
      };
    } catch (error: any) {
      console.error('Get notifications error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPreferences() {
    try {
      const response = await this.agent.app.bsky.actor.getPreferences();
      return { success: true, data: response.data.preferences };
    } catch (error: any) {
      console.error('Get preferences error:', error);
      return { success: false, error: error.message };
    }
  }

  async putPreferences(preferences: any[]) {
    try {
      await this.agent.app.bsky.actor.putPreferences({ preferences });
      return { success: true };
    } catch (error: any) {
      console.error('Put preferences error:', error);
      return { success: false, error: error.message };
    }
  }

  async getFeedGenerators(uris: string[]) {
    try {
      const response = await this.agent.app.bsky.feed.getFeedGenerators({ feeds: uris });
      return { success: true, data: response.data.feeds };
    } catch (error: any) {
      console.error('Get feed generators error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSavedFeeds(items: Array<{ id: string; type: string; value: string; pinned: boolean }>) {
    try {
      const prefsResult = await this.getPreferences();
      const existingPrefs = prefsResult.success && prefsResult.data ? prefsResult.data : [];
      const nextPrefs = existingPrefs.filter(
        (pref: any) =>
          pref?.$type !== 'app.bsky.actor.defs#savedFeedsPref' &&
          pref?.$type !== 'app.bsky.actor.defs#savedFeedsPrefV2'
      );
      nextPrefs.push({
        $type: 'app.bsky.actor.defs#savedFeedsPrefV2',
        items,
      });
      await this.putPreferences(nextPrefs);
      return { success: true };
    } catch (error: any) {
      console.error('Update saved feeds error:', error);
      return { success: false, error: error.message };
    }
  }

  async pinFeed(value: string, type: 'feed' | 'list' | 'timeline' = 'feed') {
    try {
      const prefsResult = await this.getPreferences();
      const existingPrefs = prefsResult.success && prefsResult.data ? prefsResult.data : [];
      const savedPref = existingPrefs.find(
        (pref: any) =>
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPrefV2' ||
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPref'
      );
      const items: Array<{ id: string; type: string; value: string; pinned: boolean }> = savedPref?.items || [];
      const existing = items.find((item) => item.value === value && item.type === type);
      const nextItems = existing
        ? items.map((item) =>
            item.value === value && item.type === type ? { ...item, pinned: true } : item
          )
        : [
            ...items,
            {
              id: `${type}:${value}`,
              type,
              value,
              pinned: true,
            },
          ];
      await this.updateSavedFeeds(nextItems);
      return { success: true };
    } catch (error: any) {
      console.error('Pin feed error:', error);
      return { success: false, error: error.message };
    }
  }

  async unpinFeed(value: string, type: 'feed' | 'list' | 'timeline' = 'feed') {
    try {
      const prefsResult = await this.getPreferences();
      const existingPrefs = prefsResult.success && prefsResult.data ? prefsResult.data : [];
      const savedPref = existingPrefs.find(
        (pref: any) =>
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPrefV2' ||
          pref?.$type === 'app.bsky.actor.defs#savedFeedsPref'
      );
      const items: Array<{ id: string; type: string; value: string; pinned: boolean }> = savedPref?.items || [];
      const nextItems = items.map((item) =>
        item.value === value && item.type === type ? { ...item, pinned: false } : item
      );
      await this.updateSavedFeeds(nextItems);
      return { success: true };
    } catch (error: any) {
      console.error('Unpin feed error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get popular/suggested feed for explore (using getSuggestedFeeds as documented)
  async getSuggestedFeeds(cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.app.bsky.feed.getSuggestedFeeds({ cursor, limit });
      return {
        success: true,
        data: response.data.feeds,
        cursor: response.data.cursor,
      };
    } catch (error: any) {
      console.error('Get suggested feeds error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get popular feed generator posts for explore
  async getPopularFeedGenerators(cursor?: string, limit: number = 30) {
    try {
      const response = await this.agent.app.bsky.unspecced.getPopularFeedGenerators({ cursor, limit });
      return {
        success: true,
        data: response.data.feeds,
        cursor: response.data.cursor,
      };
    } catch (error: any) {
      console.error('Get popular feed generators error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get trending topics for right sidebar
  async getTrendingTopics(limit: number = 10) {
    try {
      const response = await this.agent.app.bsky.unspecced.getTrendingTopics({ limit });
      return {
        success: true,
        data: response.data.topics,
      };
    } catch (error: any) {
      console.error('Get trending topics error:', error);
      return { success: false, error: error.message };
    }
  }

  // Search actors (users) for explore
  async searchActors(query: string, cursor?: string, limit: number = 25) {
    try {
      const response = await this.agent.searchActors({ term: query, cursor, limit });
      return {
        success: true,
        data: response.data.actors,
        cursor: response.data.cursor,
      };
    } catch (error: any) {
      if (error?.status === 401 || error?.message?.includes('Authentication Required')) {
        return await this.searchActorsPublic(query, cursor, limit);
      }
      console.error('Search actors error:', error);
      return { success: false, error: error.message };
    }
  }

  async searchActorsPublic(query: string, cursor?: string, limit: number = 25) {
    try {
      const params = new URLSearchParams();
      params.set('term', query);
      params.set('limit', String(limit));
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`${PUBLIC_API}/xrpc/app.bsky.actor.searchActors?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      return {
        success: true,
        data: data.actors || [],
        cursor: data.cursor,
      };
    } catch (error: any) {
      console.error('Search actors public error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get suggested actors to follow
  async getSuggestions(cursor?: string, limit: number = 10) {
    try {
      const response = await this.agent.getSuggestions({ cursor, limit });
      return {
        success: true,
        data: response.data.actors,
        cursor: response.data.cursor,
      };
    } catch (error: any) {
      console.error('Get suggestions error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
export const atprotoClient = new ATProtoClient();
