export interface ChatProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  text?: string;
  sentAt: string;
  senderDid: string;
  isDeleted?: boolean;
  isPending?: boolean;
}

export interface ChatConvo {
  id: string;
  rev: string;
  members: ChatProfile[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  status?: 'request' | 'accepted' | string;
}

export interface ChatConvoListResponse {
  convos: ChatConvo[];
  cursor?: string;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  cursor?: string;
}

class ChatApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
  }
}

const CHAT_API_BASE = '/api/chat';

const normalizeMessage = (message: any): ChatMessage | undefined => {
  if (!message || typeof message !== 'object') return undefined;
  const hasText = typeof message.text === 'string';
  const senderDid = message.sender?.did ?? '';
  const fallbackId =
    message.id ?? globalThis.crypto?.randomUUID?.() ?? `temp-${Math.random().toString(36).slice(2)}`;
  return {
    id: fallbackId,
    text: hasText ? message.text : undefined,
    sentAt: message.sentAt ?? new Date().toISOString(),
    senderDid,
    isDeleted: !hasText,
  };
};

const normalizeConvo = (convo: any): ChatConvo => ({
  id: convo.id,
  rev: convo.rev,
  members: (convo.members ?? []).map((member: any) => ({
    did: member.did,
    handle: member.handle,
    displayName: member.displayName,
    avatar: member.avatar,
  })),
  lastMessage: normalizeMessage(convo.lastMessage),
  unreadCount: convo.unreadCount ?? 0,
  status: convo.status,
});

const safeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${CHAT_API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const data = await safeJson(response);
    const message = data?.error || `Chat request failed (${response.status}).`;
    throw new ChatApiError(message, response.status);
  }

  const data = await safeJson(response);
  return data as T;
};

export const chatApi = {
  async createSession(identifier: string, appPassword: string) {
    return request<{ success: boolean; did: string; handle?: string }>(`/session`, {
      method: 'POST',
      body: JSON.stringify({ identifier, appPassword }),
    });
  },

  async checkSession() {
    return request<{ active: boolean; did: string; handle?: string }>(`/session`);
  },

  async listConvos(params: {
    limit?: number;
    cursor?: string;
    readState?: 'unread' | string;
    status?: 'request' | 'accepted' | string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.readState) query.set('readState', params.readState);
    if (params.status) query.set('status', params.status);

    const data = await request<any>(`/convos?${query.toString()}`);
    return {
      convos: (data.convos ?? []).map(normalizeConvo),
      cursor: data.cursor,
    } as ChatConvoListResponse;
  },

  async getConvoForMembers(members: string[]) {
    const data = await request<any>(`/convo/for-members`, {
      method: 'POST',
      body: JSON.stringify({ members }),
    });
    return { convo: normalizeConvo(data.convo) } as { convo: ChatConvo };
  },

  async getMessages(params: { convoId: string; cursor?: string; limit?: number }) {
    const query = new URLSearchParams({ convoId: params.convoId });
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', String(params.limit));
    const data = await request<any>(`/messages?${query.toString()}`);
    return {
      messages: (data.messages ?? []).map(normalizeMessage).filter(Boolean),
      cursor: data.cursor,
    } as ChatMessagesResponse;
  },

  async sendMessage(convoId: string, text: string) {
    const data = await request<any>(`/send`, {
      method: 'POST',
      body: JSON.stringify({ convoId, text }),
    });
    return normalizeMessage(data) as ChatMessage;
  },

  async updateRead(convoId?: string, messageId?: string, status?: 'request' | 'accepted') {
    return request<{ updatedCount?: number; convo?: ChatConvo }>(`/read`, {
      method: 'POST',
      body: JSON.stringify({ convoId, messageId, status }),
    });
  },

  async acceptConvo(convoId: string) {
    return request<{ convo: ChatConvo }>(`/accept`, {
      method: 'POST',
      body: JSON.stringify({ convoId }),
    });
  },
};

export const resolveHandleToDid = async (handle: string) => {
  const clean = handle.trim().replace(/^@/, '');
  if (!clean) {
    throw new ChatApiError('Handle is required.', 400);
  }

  const url = new URL('https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle');
  url.searchParams.set('handle', clean);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const data = await safeJson(response);
    const message = data?.error || 'Unable to resolve handle.';
    throw new ChatApiError(message, response.status);
  }

  const data = await response.json();
  return data?.did as string;
};

export { ChatApiError };
