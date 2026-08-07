export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | string;

export interface AgentExecution {
  name: string;
  status: AgentStatus;
}

export interface Execution {
  planner?: string | null;
  agents: AgentExecution[];
  trace: string[];
}

export interface UICard {
  type: string;
  payload: Record<string, unknown>;
}

export interface Source {
  title: string;
  url?: string | null;
}

export interface ChatResponse {
  version: string;
  conversation_id: string;
  message: {
    role: 'assistant' | string;
    content: string;
  };
  execution: Execution;
  cards: UICard[];
  sources: Source[];
}

export interface HealthResponse {
  status: string;
  hermes_configured: boolean;
  mode: string;
}

export interface ChatRequest {
  conversation_id: string;
  message: string;
}
