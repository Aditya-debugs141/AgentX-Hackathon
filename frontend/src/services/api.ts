import type { ChatRequest, ChatResponse, HealthResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
let sessionToken: string | null = null;
let sessionPromise: Promise<string> | null = null;

console.info('[AgentX config]', {
  mode: import.meta.env.MODE,
  apiBaseUrlConfigured: Boolean(import.meta.env.VITE_API_BASE_URL),
  apiRouting: API_BASE_URL || 'same-origin',
  authMode: 'short-lived-server-token',
});

async function getSessionToken(): Promise<string> {
  if (sessionToken) return sessionToken;
  if (!sessionPromise) {
    sessionPromise = fetch(`${API_BASE_URL}/auth/session`, { method: 'POST' })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.text()) || `Session request failed with status ${response.status}`);
        const data = await response.json() as { token?: string };
        if (!data.token) throw new Error('Session response did not contain a token');
        sessionToken = data.token;
        return data.token;
      })
      .finally(() => { sessionPromise = null; });
  }
  return sessionPromise;
}

async function authenticatedFetch(path: string, init: RequestInit): Promise<Response> {
  const send = async (token: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  };

  let response = await send(await getSessionToken());
  if (response.status === 401) {
    sessionToken = null;
    response = await send(await getSessionToken());
  }
  return response;
}

async function request<T>(path: string, init?: RequestInit, authenticated = false): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (authenticated) headers.set('Authorization', `Bearer ${await getSessionToken()}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('/health', { signal });
}

export function sendChat(payload: ChatRequest): Promise<ChatResponse> {
  return authenticatedFetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) throw new Error((await response.text()) || `Request failed with status ${response.status}`);
    return response.json() as Promise<ChatResponse>;
  });
}

export interface StreamEvent {
  type?: string;
  [key: string]: unknown;
}

export async function streamChat(payload: ChatRequest, onEvent: (event: StreamEvent) => void): Promise<void> {
  const response = await authenticatedFetch('/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) throw new Error((await response.text()) || `Stream failed with status ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const consume = (block: string) => {
    const lines = block.split('\n');
    const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
    const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data || data === '[DONE]') return;
    try {
      const event = JSON.parse(data) as StreamEvent;
      if (eventName && !event.type) event.type = eventName;
      onEvent(event);
    } catch { /* Ignore keep-alive or non-JSON SSE frames. */ }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    blocks.forEach(consume);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);
}
