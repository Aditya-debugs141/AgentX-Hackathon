import { useCallback, useState } from 'react';
import { streamChat, type StreamEvent } from '../services/api';
import type { AgentExecution, ChatResponse, UICard, Source } from '../types/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  execution?: ChatResponse['execution'];
  cards?: UICard[];
  sources?: Source[];
}

const initialMessage: ChatMessage = {
  id: 'msg-init',
  role: 'assistant',
  text: 'System initialized. I am your Smart Campus Assistant powered by the Hermes Orchestrator Engine. How can I help you today?',
};

export function useChat() {
  const [conversationId, setConversationId] = useState(() => `conv_${crypto.randomUUID()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [agents, setAgents] = useState<AgentExecution[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || isTyping) return;

    const userMessage: ChatMessage = {
      id: `${conversationId}-user-${Date.now()}`,
      role: 'user',
      text: message,
    };
    setMessages((current) => [...current, userMessage]);
    setIsTyping(true);

    const assistantId = `${conversationId}-assistant-${Date.now()}`;
    setMessages((current) => [...current, { id: assistantId, role: 'assistant', text: '', execution: { agents: [], trace: [] }, cards: [], sources: [] }]);

    const updateAssistant = (update: Partial<ChatMessage>) => {
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, ...update } : item));
    };

    const handleStreamEvent = (event: StreamEvent) => {
      if (typeof event.conversation_id === 'string') setConversationId(event.conversation_id);
      if (event.type === 'error') throw new Error(`Hermes stream failed (status ${String(event.status ?? 'unknown')})`);
      const choices = Array.isArray(event.choices) ? event.choices : [];
      const delta = choices[0] && typeof choices[0] === 'object' ? (choices[0] as { delta?: { content?: unknown } }).delta : undefined;
      const content = typeof delta?.content === 'string' ? delta.content : undefined;
      if (content) {
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: item.text + content } : item));
      }

      const execution = event.execution as ChatResponse['execution'] | undefined;
      if (execution) {
        updateAssistant({ execution });
        setAgents(execution.agents);
      }
      const agent = event.agent as { name?: unknown; status?: unknown } | undefined;
      if (agent && typeof agent.name === 'string' && typeof agent.status === 'string') {
        const agentName = agent.name;
        const agentStatus = agent.status;
        setMessages((current) => current.map((item) => {
          if (item.id !== assistantId) return item;
          const currentExecution = item.execution ?? { agents: [], trace: [] };
          const agents = currentExecution.agents.filter((itemAgent) => itemAgent.name !== agentName);
          return { ...item, execution: { ...currentExecution, agents: [...agents, { name: agentName, status: agentStatus }] } };
        }));
        setAgents((current) => [...current.filter((item) => item.name !== agentName), { name: agentName, status: agentStatus }]);
      }
      if (Array.isArray(event.cards)) updateAssistant({ cards: event.cards as ChatResponse['cards'] });
      if (Array.isArray(event.sources)) updateAssistant({ sources: event.sources as ChatResponse['sources'] });
      if (event.type === 'card' && event.card) {
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, cards: [...(item.cards ?? []), event.card as ChatResponse['cards'][number]] } : item));
      }
      if (event.type === 'source' && event.source) {
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, sources: [...(item.sources ?? []), event.source as ChatResponse['sources'][number]] } : item));
      }
      if (typeof event.trace === 'string') {
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, execution: { ...(item.execution ?? { agents: [], trace: [] }), trace: [...(item.execution?.trace ?? []), event.trace as string] } } : item));
      }

      const message = event.message as ChatResponse['message'] | undefined;
      if (message && typeof message.content === 'string') updateAssistant({ text: message.content });
    };

    try {
      await streamChat({ conversation_id: conversationId, message }, handleStreamEvent);
    } catch (error) {
      setMessages((current) => [...current, {
        id: `${conversationId}-error-${Date.now()}`,
        role: 'assistant',
        text: `Connection to Hermes Agent failed.\n\n**Details:**\n\`${error instanceof Error ? error.message : 'Unknown error'}\``,
      }]);
      throw error;
    } finally {
      setIsTyping(false);
    }
  }, [conversationId, isTyping]);

  return { conversationId, messages, agents, isTyping, sendMessage };
}
