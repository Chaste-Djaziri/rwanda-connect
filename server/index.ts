import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { AtpAgent } from '@atproto/api';

const BSKY_SERVICE = 'https://bsky.social';
const PUBLIC_API = 'https://public.api.bsky.app';
const CHAT_SERVICE_DID = 'did:web:api.bsky.chat';
const CHAT_SERVICE_TYPE = 'bsky_chat';
const PORT = Number(process.env.PORT ?? 8787);
const SITE_URL = process.env.SITE_URL ?? 'https://hillside.micorp.pro';
const DEFAULT_OG_IMAGE =
  process.env.DEFAULT_OG_IMAGE ?? `${SITE_URL.replace(/\/$/, '')}/logo/light-mode-logo.png`;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? '';
const EMOJI_API_ORIGIN = 'https://www.emoji.family';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

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

interface PageMeta {
  title: string;
  description: string;
  url: string;
  image?: string;
  type: 'website' | 'article' | 'profile';
  twitterCard: 'summary' | 'summary_large_image';
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

const forwardEmojiRequest = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
  const proxyPath = url.pathname.replace(/^\/api\/emoji/, '/api');
  const target = new URL(proxyPath, EMOJI_API_ORIGIN);
  target.search = url.search;

  const response = await fetch(target.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': 'HiiSideBot/1.0 (+https://hillside.micorp.pro)',
      Accept: req.headers.accept ?? '*/*',
    },
  });

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  res.writeHead(response.status, {
    'Content-Type': contentType,
    'Cache-Control': response.headers.get('cache-control') ?? 'public, max-age=86400',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceOrInsert = (html: string, regex: RegExp, tag: string) => {
  if (regex.test(html)) {
    return html.replace(regex, tag);
  }
  return html.replace('</head>', `  ${tag}\n</head>`);
};

const upsertMeta = (html: string, attr: string, content: string) => {
  const safeContent = escapeHtml(content);
  const tag = `<meta ${attr} content="${safeContent}" />`;
  const regex = new RegExp(`<meta\\s+[^>]*${escapeRegex(attr)}[^>]*>`, 'i');
  return replaceOrInsert(html, regex, tag);
};

const upsertLink = (html: string, rel: string, href: string) => {
  const safeHref = escapeHtml(href);
  const tag = `<link rel="${rel}" href="${safeHref}" />`;
  const regex = new RegExp(`<link\\s+[^>]*rel=["']${escapeRegex(rel)}["'][^>]*>`, 'i');
  return replaceOrInsert(html, regex, tag);
};

const upsertTitle = (html: string, title: string) => {
  const safeTitle = escapeHtml(title);
  return html.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`);
};

const applyMetaToHtml = (html: string, meta: PageMeta) => {
  let next = html;
  next = upsertTitle(next, meta.title);
  next = upsertMeta(next, 'name="description"', meta.description);
  next = upsertLink(next, 'canonical', meta.url);
  next = upsertMeta(next, 'property="og:title"', meta.title);
  next = upsertMeta(next, 'property="og:description"', meta.description);
  next = upsertMeta(next, 'property="og:url"', meta.url);
  next = upsertMeta(next, 'property="og:type"', meta.type);
  next = upsertMeta(next, 'property="og:site_name"', 'HiiSide');
  next = upsertMeta(next, 'name="twitter:title"', meta.title);
  next = upsertMeta(next, 'name="twitter:description"', meta.description);
  next = upsertMeta(next, 'name="twitter:card"', meta.twitterCard);
  if (meta.image) {
    next = upsertMeta(next, 'property="og:image"', meta.image);
    next = upsertMeta(next, 'name="twitter:image"', meta.image);
  }
  return next;
};

const getContentType = (ext: string) => {
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.ico':
      return 'image/x-icon';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.xml':
      return 'application/xml; charset=utf-8';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
};

const readFileIfExists = async (filePath: string) => {
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) return null;
    return await readFile(filePath);
  } catch {
    return null;
  }
};

const resolveStaticPath = (root: string, pathname: string) => {
  const trimmed = pathname.replace(/^\/+/, '');
  const resolved = path.resolve(root, trimmed);
  if (!resolved.startsWith(root)) return null;
  return resolved;
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HiiSideBot/1.0 (+https://hillside.micorp.pro)' },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
};

const getEmbedImage = (embed: any): string | undefined => {
  if (!embed) return undefined;
  const type = embed.$type as string | undefined;
  if (type === 'app.bsky.embed.images#view' && embed.images?.length) {
    return embed.images[0]?.fullsize ?? embed.images[0]?.thumb;
  }
  if (type === 'app.bsky.embed.external#view') {
    return embed.external?.thumb ?? undefined;
  }
  if (type === 'app.bsky.embed.video#view') {
    return embed.thumbnail ?? undefined;
  }
  if (type === 'app.bsky.embed.recordWithMedia#view') {
    return getEmbedImage(embed.media);
  }
  return undefined;
};

const buildDefaultMeta = (pathname: string): PageMeta => {
  const url = `${SITE_URL.replace(/\/$/, '')}${pathname}`;
  return {
    title: 'HiiSide - Decentralized Social Platform',
    description:
      'HiiSide is a decentralized social platform built on the AT Protocol. Own your data, build community, and connect through an open, federated network.',
    url,
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    twitterCard: 'summary_large_image',
  };
};

const buildProfileMeta = async (handle: string, pathname: string): Promise<PageMeta> => {
  const cleanedHandle = handle.replace(/^@/, '');
  const profile = await fetchJson<any>(
    `${PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(cleanedHandle)}`
  );
  const titleBase = profile?.displayName || `@${profile?.handle ?? cleanedHandle}`;
  const description = profile?.description
    ? truncateText(profile.description, 200)
    : `@${profile?.handle ?? cleanedHandle} on HiiSide.`;
  const url = `${SITE_URL.replace(/\/$/, '')}${pathname}`;
  return {
    title: titleBase,
    description,
    url,
    image: profile?.avatar ?? DEFAULT_OG_IMAGE,
    type: 'profile',
    twitterCard: profile?.avatar ? 'summary' : 'summary_large_image',
  };
};

const buildPostMeta = async (
  handle: string,
  postId: string,
  pathname: string
): Promise<PageMeta> => {
  const cleanedHandle = handle.replace(/^@/, '');
  const resolve = await fetchJson<{ did?: string }>(
    `${PUBLIC_API}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(cleanedHandle)}`
  );
  const did = resolve?.did;
  if (!did) {
    return buildDefaultMeta(pathname);
  }
  const uri = `at://${did}/app.bsky.feed.post/${postId}`;
  const params = new URLSearchParams({
    uri,
    depth: '0',
    parentHeight: '0',
  });
  const threadData = await fetchJson<any>(
    `${PUBLIC_API}/xrpc/app.bsky.feed.getPostThread?${params.toString()}`
  );
  const post = threadData?.thread?.post ?? threadData?.post;
  if (!post) {
    return buildDefaultMeta(pathname);
  }
  const authorHandle = post.author?.handle ?? cleanedHandle;
  const authorName = post.author?.displayName ?? `@${authorHandle}`;
  const description = post.record?.text
    ? truncateText(String(post.record.text), 200)
    : `Post by @${authorHandle} on HiiSide.`;
  const image = getEmbedImage(post.embed) ?? post.author?.avatar ?? DEFAULT_OG_IMAGE;
  const url = `${SITE_URL.replace(/\/$/, '')}${pathname}`;
  return {
    title: `Post by ${authorName}`,
    description,
    url,
    image,
    type: 'article',
    twitterCard: image ? 'summary_large_image' : 'summary',
  };
};

const buildMetaForPath = async (pathname: string): Promise<PageMeta> => {
  const postMatch = pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)\/?$/);
  if (postMatch) {
    return buildPostMeta(decodeURIComponent(postMatch[1]), decodeURIComponent(postMatch[2]), pathname);
  }
  const profileMatch = pathname.match(/^\/profile\/([^/]+)\/?$/);
  if (profileMatch) {
    return buildProfileMeta(decodeURIComponent(profileMatch[1]), pathname);
  }
  const hashtagMatch = pathname.match(/^\/hashtag\/([^/]+)\/?$/);
  if (hashtagMatch) {
    const tag = decodeURIComponent(hashtagMatch[1]);
    const url = `${SITE_URL.replace(/\/$/, '')}${pathname}`;
    return {
      title: `#${tag} on HiiSide`,
      description: `Latest posts tagged #${tag} on HiiSide.`,
      url,
      image: DEFAULT_OG_IMAGE,
      type: 'website',
      twitterCard: 'summary_large_image',
    };
  }
  return buildDefaultMeta(pathname);
};

const getIndexTemplate = async () => {
  const distIndex = path.join(DIST_DIR, 'index.html');
  const template = await readFileIfExists(distIndex);
  if (template) return template.toString('utf8');
  const fallback = await readFile(path.join(process.cwd(), 'index.html'));
  return fallback.toString('utf8');
};

const serveStaticFile = async (res: ServerResponse, filePath: string, method: string) => {
  const buffer = await readFileIfExists(filePath);
  if (!buffer) return false;
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': getContentType(ext),
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  if (method === 'HEAD') {
    res.end();
    return true;
  }
  res.end(buffer);
  return true;
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
    if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/api/emoji/')) {
      await forwardEmojiRequest(req, res, url);
      return;
    }

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
      if (COOKIE_DOMAIN) {
        cookieParts.push(`Domain=${COOKIE_DOMAIN.startsWith('.') ? COOKIE_DOMAIN : `.${COOKIE_DOMAIN}`}`);
      }
      if (process.env.NODE_ENV === 'production') {
        cookieParts.push('Secure');
      }
      res.setHeader('Set-Cookie', cookieParts.join('; '));
      sendJson(res, 200, { success: true, did: agent.did, handle: agent.session?.handle });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/session/restore') {
      const body = await readJsonBody<{ session?: any }>(req);
      const sessionData = body.session;

      if (!sessionData?.accessJwt || !sessionData?.refreshJwt || !sessionData?.did) {
        sendJson(res, 400, { error: 'Invalid session payload.' });
        return;
      }

      const agent = new AtpAgent({ service: BSKY_SERVICE });
      await agent.resumeSession(sessionData);

      if (!agent.did) {
        sendJson(res, 401, { error: 'Unable to restore chat session.' });
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
      if (COOKIE_DOMAIN) {
        cookieParts.push(`Domain=${COOKIE_DOMAIN.startsWith('.') ? COOKIE_DOMAIN : `.${COOKIE_DOMAIN}`}`);
      }
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

      if (!Array.isArray(body.members) || body.members.length === 0) {
        sendJson(res, 400, { error: 'Missing members array.' });
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

      if (!Array.isArray(body.members) || body.members.length === 0) {
        sendJson(res, 400, { error: 'Missing members array.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.getConvoAvailability({
        members: body.members,
      });

      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/chat/convo') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const convoId = url.searchParams.get('convoId');

      if (!convoId) {
        sendJson(res, 400, { error: 'Missing convoId query parameter.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.getConvo({ convoId });
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
        sendJson(res, 400, { error: 'Missing convoId query parameter.' });
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

    if (req.method === 'POST' && pathname === '/api/chat/message') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ convoId?: string; text?: string }>(req);

      if (!body.convoId || !body.text?.trim()) {
        sendJson(res, 400, { error: 'Missing convoId or text.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.sendMessage({
        convoId: body.convoId,
        message: {
          text: body.text.trim(),
        },
      });

      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/delete-message') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ convoId?: string; messageId?: string }>(req);

      if (!body.convoId || !body.messageId) {
        sendJson(res, 400, { error: 'Missing convoId or messageId.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.deleteMessage({
        convoId: body.convoId,
        messageId: body.messageId,
      });

      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/leave-convo') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ convoId?: string }>(req);

      if (!body.convoId) {
        sendJson(res, 400, { error: 'Missing convoId.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.leaveConvo({
        convoId: body.convoId,
      });

      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/mark-read') {
      const session = requireSession(req, res);
      if (!session) return;
      const chatAgent = getChatAgent(session);
      const body = await readJsonBody<{ convoId?: string; messageId?: string }>(req);

      if (!body.convoId || !body.messageId) {
        sendJson(res, 400, { error: 'Missing convoId or messageId.' });
        return;
      }

      const response = await chatAgent.chat.bsky.convo.updateRead({
        convoId: body.convoId,
        messageId: body.messageId,
      });

      sendJson(res, 200, response.data);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/chat/delete-session') {
      destroySession(req);
      sendJson(res, 200, { success: true });
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      const distPath = resolveStaticPath(DIST_DIR, pathname);
      if (distPath && (await serveStaticFile(res, distPath, req.method))) return;

      const publicPath = resolveStaticPath(PUBLIC_DIR, pathname);
      if (publicPath && (await serveStaticFile(res, publicPath, req.method))) return;

      const template = await getIndexTemplate();
      const meta = await buildMetaForPath(pathname);
      const html = applyMetaToHtml(template, meta);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (error) {
    handleError(res, error);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
