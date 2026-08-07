import type { ChatRequest, ChatResponse, HealthResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
const WEB_API_KEY = import.meta.env.VITE_WEB_API_KEY;

console.info('[Dosth config]', {
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
