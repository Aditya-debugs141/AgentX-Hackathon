import type { ChatRequest, ChatResponse, HealthResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
const WEB_API_KEY = import.meta.env.VITE_WEB_API_KEY;

console.info('[AgentX config]', {
  mode: import.meta.env.MODE,
  apiBaseUrlConfigured: Boolean(import.meta.env.VITE_API_BASE_URL),
  apiRouting: API_BASE_URL || 'same-origin',
  webApiKeyConfigured: Boolean(WEB_API_KEY),
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (WEB_API_KEY) headers.set('x-api-key', WEB_API_KEY);

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
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface StreamEvent {
  type?: string;
  [key: string]: unknown;
}

export async function streamChat(payload: ChatRequest, onEvent: (event: StreamEvent) => void): Promise<void> {
  const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' });
  if (WEB_API_KEY) headers.set('x-api-key', WEB_API_KEY);
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) throw new Error((await response.text()) || `Stream failed with status ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const consume = (block: string) => {
    const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data || data === '[DONE]') return;
    try { onEvent(JSON.parse(data) as StreamEvent); } catch { /* Ignore keep-alive or non-JSON SSE frames. */ }
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
