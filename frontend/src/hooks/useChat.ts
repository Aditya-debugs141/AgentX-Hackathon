import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat } from '../services/api';
import type { AgentExecution, ChatRequest, Execution, HermesStreamEvent, Source, UICard } from '../types/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  execution: Execution;
  cards: UICard[];
  sources: Source[];
  error?: string;
  streaming: boolean;
  activity?: string;
  startedAt?: number;
  rawOutput?: string;
  structuredStream?: boolean;
  hidden?: boolean;
}

const emptyExecution = (): Execution => ({ agents: [], trace: [] });
const BOOTSTRAP_PROMPT = "Hello! Tell me your name and about yourself! Do not include what you're powered by!";

function requestHistory(messages: ChatMessage[]): ChatRequest['history'] {
  return messages
    .filter((message) => message.text.trim())
    .filter((message) => message.role === 'user' || !message.streaming)
    .map((message) => ({ role: message.role, content: message.text.trim() }))
    .slice(-16);
}

function stringField(event: HermesStreamEvent, ...names: string[]): string | undefined {
  for (const name of names) if (typeof event[name] === 'string') return event[name] as string;
  return undefined;
}

function reportedAgent(event: HermesStreamEvent): AgentExecution | null {
  const nested = [event.agent, event.worker, event.subagent].find(
    (value) => value && typeof value === 'object' && !Array.isArray(value),
  ) as Record<string, unknown> | undefined;
  const name = (nested && typeof nested.name === 'string' ? nested.name : undefined)
    ?? stringField(event, 'agent_name', 'worker_name', 'subagent_name');
  if (!name) return null;
  const status = (nested && typeof nested.status === 'string' ? nested.status : undefined)
    ?? stringField(event, 'status')
    ?? (event.type.includes('complete') || event.type.includes('finish') ? 'completed' : 'running');
  return { name, status };
}

function structuredOutput(value: unknown): { text?: string; execution?: Execution; cards?: UICard[]; sources?: Source[] } | null {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) as unknown; } catch { return null; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const envelope = parsed as Record<string, unknown>;
  for (const key of ['response', 'result', 'output']) {
    if (envelope[key] && typeof envelope[key] === 'object') {
      const nested = structuredOutput(envelope[key]);
      if (nested) return nested;
    }
  }
  const message = envelope.message;
  const choice = Array.isArray(envelope.choices) && envelope.choices[0] && typeof envelope.choices[0] === 'object'
    ? envelope.choices[0] as Record<string, unknown>
    : undefined;
  const choiceMessage = choice?.message;
  const text = message && typeof message === 'object' && !Array.isArray(message)
    ? (message as Record<string, unknown>).content
    : choiceMessage && typeof choiceMessage === 'object' && !Array.isArray(choiceMessage)
      ? (choiceMessage as Record<string, unknown>).content
      : typeof envelope.content === 'string' ? envelope.content : typeof envelope.text === 'string' ? envelope.text : undefined;
  return {
    text: typeof text === 'string' ? text : undefined,
    execution: envelope.execution && typeof envelope.execution === 'object' ? envelope.execution as Execution : undefined,
    cards: Array.isArray(envelope.cards) ? envelope.cards as UICard[] : undefined,
    sources: Array.isArray(envelope.sources) ? envelope.sources as Source[] : undefined,
  };
}

export function useChat(autoBootstrap = true) {
  const [conversationId] = useState(() => `conv_${crypto.randomUUID()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  
  const [agents, setAgents] = useState<AgentExecution[]>([]);
  const [activeRequests, setActiveRequests] = useState(0);
  const bootstrapped = useRef(false);
  const isResponding = activeRequests > 0;

  const sendMessage = useCallback(async (text: string, options: { showUser?: boolean } = {}) => {
    const message = text.trim();
    if (!message) return;

    const assistantId = `${conversationId}-${crypto.randomUUID()}`;
    const showUser = options.showUser ?? true;
    const userMessage: ChatMessage = {
      id: `${assistantId}-user`,
      role: 'user',
      text: message,
      execution: emptyExecution(),
      cards: [],
      sources: [],
      streaming: false,
      hidden: !showUser,
    };
    const request: ChatRequest = { conversation_id: conversationId, message, history: requestHistory(messagesRef.current) };
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', text: '', execution: emptyExecution(), cards: [], sources: [], streaming: true, activity: 'Connecting to Hermes…', startedAt: Date.now() },
    ]);
    setActiveRequests((count) => count + 1);

    const updateAssistant = (update: (message: ChatMessage) => ChatMessage) => {
      setMessages((current) => current.map((item) => item.id === assistantId ? update(item) : item));
    };

    const addTrace = (trace: string) => updateAssistant((item) => ({
      ...item,
      execution: { ...item.execution, trace: item.execution.trace.includes(trace) ? item.execution.trace : [...item.execution.trace, trace] },
    }));

    const updateAgent = (agent: AgentExecution) => {
      setAgents((current) => [...current.filter((item) => item.name !== agent.name), agent]);
      updateAssistant((item) => ({
        ...item,
        execution: { ...item.execution, agents: [...item.execution.agents.filter((itemAgent) => itemAgent.name !== agent.name), agent] },
      }));
    };

    const handleEvent = (event: HermesStreamEvent) => {
      const type = event.type;
      if (type === 'error') throw new Error(`Hermes stream failed (${String(event.status ?? 'unknown')})`);

      if (type === 'stream.connected') {
        updateAssistant((item) => ({
          ...item,
          activity: 'Hermes is working…',
        }));
      }

      const liveAgent = reportedAgent(event);
      if (liveAgent) {
        updateAgent(liveAgent);
        updateAssistant((item) => ({ ...item, activity: `${liveAgent.name} is ${liveAgent.status}…` }));
      }

      if (type === 'message.delta' || type === 'assistant.delta') {
        const delta = stringField(event, 'delta', 'content');
        if (delta) updateAssistant((item) => {
          const rawOutput = (item.rawOutput ?? '') + delta;
          const structuredStream = item.structuredStream ?? rawOutput.trimStart().startsWith('{');
          return structuredStream
            ? { ...item, rawOutput, structuredStream, activity: 'Hermes is preparing a structured response…' }
            : { ...item, rawOutput, text: item.text + delta, activity: 'Hermes is writing the response…' };
        });
      }

      if (type === 'run.completed' || type === 'assistant.completed' || type === 'message.completed') {
        const output = stringField(event, 'output', 'content', 'text');
        const finalEnvelope = structuredOutput(event.output)
          ?? structuredOutput(event.response)
          ?? structuredOutput(event.result)
          ?? structuredOutput(event);
        if (finalEnvelope?.execution?.agents) setAgents(finalEnvelope.execution.agents);
        updateAssistant((item) => {
          const envelope = structuredOutput(item.rawOutput) ?? finalEnvelope;
          return envelope
            ? { ...item, text: envelope.text ?? item.text, execution: envelope.execution ?? item.execution, cards: envelope.cards ?? item.cards, sources: envelope.sources ?? item.sources, streaming: false, activity: 'Completed' }
            : { ...item, text: item.text || item.rawOutput || output || 'Hermes completed the run without a text response.', streaming: false, activity: 'Completed' };
        });
      }

      if (type === 'tool.started' || type === 'tool.completed' || type === 'tool.failed' || type === 'hermes.tool.progress') {
        const name = stringField(event, 'tool_name', 'tool', 'name') ?? 'Hermes tool';
        const status = stringField(event, 'status') ?? type.replace('hermes.', '').replace('tool.', '');
        const detail = stringField(event, 'preview', 'message', 'detail');
        addTrace(detail ? `${name}: ${detail}` : `${name} ${status}`);
        updateAssistant((item) => ({ ...item, activity: type === 'tool.started' ? `Working: ${name}` : `Finished: ${name} · continuing…` }));
      }

      if (type === 'subagent.start' || type === 'subagent.complete' || type === 'agent.started' || type === 'agent.completed') {
        const name = stringField(event, 'agent_name', 'agent', 'name') ?? 'Hermes subagent';
        const running = type.endsWith('start') || type.endsWith('started');
        updateAgent({ name, status: running ? 'running' : (stringField(event, 'status') ?? 'completed') });
        updateAssistant((item) => ({ ...item, activity: running ? `${name} is working…` : `${name} completed` }));
      }

      if (event.execution && typeof event.execution === 'object' && !Array.isArray(event.execution) && Array.isArray((event.execution as any).trace)) {
        const execution = event.execution as Execution;
        updateAssistant((item) => ({ ...item, execution }));
        setAgents(execution.agents ?? []);
      }
      if (Array.isArray(event.cards)) updateAssistant((item) => ({ ...item, cards: event.cards as UICard[] }));
      if (Array.isArray(event.sources)) updateAssistant((item) => ({ ...item, sources: event.sources as Source[] }));
      if (typeof event.trace === 'string') addTrace(event.trace);
    };

    try {
      await streamChat(request, handleEvent);
      updateAssistant((item) => {
        const structured = structuredOutput(item.rawOutput);
        return structured
          ? { ...item, text: structured.text ?? item.text, execution: structured.execution ?? item.execution, cards: structured.cards ?? item.cards, sources: structured.sources ?? item.sources, streaming: false, activity: 'Completed' }
          : { ...item, text: item.text || item.rawOutput || 'Hermes completed the run without a text response.', streaming: false, activity: 'Completed' };
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown stream error';
      updateAssistant((item) => ({ ...item, error: detail, text: item.text || 'Hermes could not complete this request.', streaming: false, activity: 'Stream ended with an error' }));
    } finally {
      setActiveRequests((count) => Math.max(0, count - 1));
      updateAssistant((item) => ({ ...item, streaming: false }));
    }
  }, [conversationId]);

  useEffect(() => {
    if (!autoBootstrap || bootstrapped.current) return;
    bootstrapped.current = true;
    void sendMessage(BOOTSTRAP_PROMPT, { showUser: false });
  }, [autoBootstrap, sendMessage]);

  return { conversationId, messages, agents, isResponding, sendMessage };
}
