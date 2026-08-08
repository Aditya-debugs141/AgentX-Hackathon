import type { ChatRequest, HermesStreamEvent, HealthResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
let sessionToken: string | null = null;
let sessionRequest: Promise<string> | null = null;
const SESSION_TIMEOUT_MS = 10000;
const STREAM_CONNECT_TIMEOUT_MS = 15000;

console.info('[Dosth config]', {
  mode: import.meta.env.MODE,
  apiBaseUrl: API_BASE_URL || 'same-origin',
});

async function getSessionToken(): Promise<string> {
  if (sessionToken) return sessionToken;
  sessionRequest ??= fetch(`${API_BASE_URL}/auth/session`, {
    method: 'POST',
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Session request failed (${response.status})`);
      const body = await response.json() as { token?: unknown };
      if (typeof body.token !== 'string' || !body.token) throw new Error('Backend did not issue a session token');
      sessionToken = body.token;
      return body.token;
    })
    .finally(() => { sessionRequest = null; });
  return sessionRequest;
}

async function authorizedRequest(path: string, init: RequestInit, timeoutMs?: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = timeoutMs ? window.setTimeout(() => controller.abort(), timeoutMs) : undefined;
  const requestInit: RequestInit = { ...init, signal: controller.signal };
  const send = async (token: string) => {
    const headers = new Headers(requestInit.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${API_BASE_URL}${path}`, { ...requestInit, headers });
  };

  try {
    let response = await send(await getSessionToken());
    if (response.status === 401) {
      sessionToken = null;
      response = await send(await getSessionToken());
    }
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Backend connection timed out after ${Math.round((timeoutMs ?? 0) / 1000)}s`);
    }
    throw error;
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
}

export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal });
  if (!response.ok) throw new Error(`Health check failed (${response.status})`);
  return response.json() as Promise<HealthResponse>;
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value) as unknown; } catch { return value; }
}

function normalizeEvent(data: string, sseEventName?: string): HermesStreamEvent | null {
  if (!data || data === '[DONE]') return null;
  const parsed = parseJson(data);
  if (typeof parsed === 'string') return { type: sseEventName ?? 'message.delta', delta: parsed };
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const event = { ...(parsed as Record<string, unknown>) };
  const type = typeof event.type === 'string'
    ? event.type
    : typeof event.event === 'string'
      ? event.event
      : sseEventName;
  if (!type) return null;
  return { ...event, type };
}

function consumeBlock(block: string, onEvent: (event: HermesStreamEvent) => void): void {
  const lines = block.split(/\r?\n/);
  const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
  const event = normalizeEvent(data, eventName);
  if (event) onEvent(event);
}

export async function streamChat(request: ChatRequest, onEvent: (event: HermesStreamEvent) => void): Promise<void> {
  const response = await authorizedRequest('/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(request),
  }, STREAM_CONNECT_TIMEOUT_MS);
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Stream request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';
      blocks.forEach((block) => consumeBlock(block, onEvent));
      if (done) break;
    }
    if (buffer.trim()) consumeBlock(buffer, onEvent);
  } finally {
    reader.cancel().catch(() => {});
  }
}
