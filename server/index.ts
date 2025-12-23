import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AtpAgent } from '@atproto/api';

const BSKY_SERVICE = 'https://bsky.social';
const CHAT_SERVICE_DID = 'did:web:api.bsky.chat';
const CHAT_SERVICE_TYPE = 'bsky_chat';
const PORT = Number(process.env.PORT ?? 8787);

const allowedOrigins = (process.env.CHAT_ALLOWED_ORIGINS ?? 'http://localhost:8080,http://127.0.0.1:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

interface SessionRecord {
  agent: AtpAgent;
  did: string;
  handle?: string;
  createdAt: number;
}

const sessions = new Map<string, SessionRecord>();

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' } as const;

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.writeHead(status, jsonHeaders);
  res.end(JSON.stringify(payload));
};

const readJsonBody = async <T = any>(req: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
};

const parseCookies = (req: IncomingMessage) => {
  const header = req.headers.cookie;
  if (!header) return {} as Record<string, string>;
  return header.split(';').reduce((acc, part) => {
    const [key, ...valueParts] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(valueParts.join('='));
    return acc;
  }, {} as Record<string, string>);
};

const setCorsHeaders = (req: IncomingMessage, res: ServerResponse) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
};

const getSession = (req: IncomingMessage) => {
  const cookies = parseCookies(req);
  const sessionId = cookies.chat_session;
  if (!sessionId) return null;
  return sessions.get(sessionId) ?? null;
};

const destroySession = (req: IncomingMessage) => {
  const cookies = parseCookies(req);
  const sessionId = cookies.chat_session;
  if (!sessionId) return;
  sessions.delete(sessionId);
};

const getChatAgent = (session: SessionRecord) => {
  return session.agent.withProxy(CHAT_SERVICE_TYPE, CHAT_SERVICE_DID);
};

const handleError = (res: ServerResponse, error: any) => {
  const status = error?.status ?? error?.statusCode ?? 500;
  if (status === 401) {
    sendJson(res, 401, { error: 'Chat session expired. Please sign in again.' });
    return;
  }
  if (status === 429) {
    sendJson(res, 429, { error: 'Rate limited by Bluesky. Please retry soon.' });
    return;
  }
  sendJson(res, 500, { error: 'Unexpected chat server error.' });
};

const requireSession = (req: IncomingMessage, res: ServerResponse) => {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: 'Chat session not found.' });
    return null;
  }
  return session;
};

const server = createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'POST' && pathname === '/api/chat/session') {
      const body = await readJsonBody<{ identifier?: string; appPassword?: string }>(req);
      const identifier = body.identifier?.trim();
      const appPassword = body.appPassword?.trim();

      if (!identifier || !appPassword) {
        sendJson(res, 400, { error: 'Missing identifier or app password.' });
        return;
      }

      const agent = new AtpAgent({ service: BSKY_SERVICE });
      const response = await agent.login({
        identifier: identifier.startsWith('@') ? identifier.slice(1) : identifier,
        password: appPassword,
      });

      if (!response?.success || !agent.did) {
        sendJson(res, 401, { error: 'Unable to start chat session.' });
        return;
      }

      const sessionId = randomUUID();
      sessions.set(sessionId, {
        agent,
        did: agent.did,
        handle: agent.session?.handle,
        createdAt: Date.now(),
      });

      const cookieParts = [`chat_session=${encodeURIComponent(sessionId)}`, 'HttpOnly', 'Path=/', 'SameSite=Lax'];
      if (process.env.NODE_ENV === 'production') {
        cookieParts.push('Secure');
      }
      res.setHeader('Set-Cookie', cookieParts.join('; '));
      sendJson(res, 200, { success: true, did: agent.did, handle: agent.session?.handle });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/chat/session') {
      const session = requireSession(req, res);
      if (!session) return;
      sendJson(res, 200, { active: true, did: session.did, handle: session.handle });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/chat/convos') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const limit = url.searchParams.get('limit');
      const cursor = url.searchParams.get('cursor') ?? undefined;
      const readState = url.searchParams.get('readState') ?? undefined;
      const status = url.searchParams.get('status') ?? undefined;

      const response = await chatAgent.chat.bsky.convo.listConvos({
        limit: limit ? Number(limit) : undefined,
        cursor: cursor || undefined,
        readState: readState || undefined,
        status: status || undefined,
      });

      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/convo/for-members') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ members?: string[] }>(req);

      if (!body.members || !Array.isArray(body.members) || body.members.length === 0) {
        sendJson(res, 400, { error: 'Members list is required.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.getConvoForMembers({
        members: body.members,
      });
      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/convo/availability') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ members?: string[] }>(req);

      if (!body.members || !Array.isArray(body.members) || body.members.length === 0) {
        sendJson(res, 400, { error: 'Members list is required.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.getConvoAvailability({
        members: body.members,
      });
      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/chat/messages') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const convoId = url.searchParams.get('convoId');
      const cursor = url.searchParams.get('cursor') ?? undefined;
      const limit = url.searchParams.get('limit');

      if (!convoId) {
        sendJson(res, 400, { error: 'convoId is required.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.getMessages({
        convoId,
        cursor: cursor || undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/send') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ convoId?: string; text?: string }>(req);
      const convoId = body.convoId?.trim();
      const text = body.text?.trim();

      if (!convoId || !text) {
        sendJson(res, 400, { error: 'convoId and text are required.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.sendMessage({
        convoId,
        message: { text },
      });

      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/read') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ convoId?: string; messageId?: string; status?: 'request' | 'accepted' }>(req);

      if (body.convoId) {
        const response = await chatAgent.chat.bsky.convo.updateRead({
          convoId: body.convoId,
          messageId: body.messageId,
        });
        sendJson(res, 200, response.data);
        return;
      }

      const response = await chatAgent.chat.bsky.convo.updateAllRead({
        status: body.status,
      });
      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/accept') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ convoId?: string }>(req);

      if (!body.convoId) {
        sendJson(res, 400, { error: 'convoId is required.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.acceptConvo({
        convoId: body.convoId,
      });
      sendJson(res, 200, response.data);
      return;
    }

    sendJson(res, 404, { error: 'Not found.' });
  } catch (error) {
    const status = (error as any)?.status ?? (error as any)?.statusCode;
    if (status === 401) {
      destroySession(req);
    }
    handleError(res, error);
  }
});

server.listen(PORT, () => {
  console.log(`Chat proxy listening on http://localhost:${PORT}`);
});
