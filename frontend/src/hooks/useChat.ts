import { useCallback, useState } from 'react';
import { sendChat } from '../services/api';
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

    try {
      const response = await sendChat({ conversation_id: conversationId, message });
      setConversationId(response.conversation_id);
      setAgents(response.execution.agents);
      setMessages((current) => [...current, {
        id: `${conversationId}-assistant-${Date.now()}`,
        role: 'assistant',
        text: response.message.content,
        execution: response.execution,
        cards: response.cards,
        sources: response.sources,
      }]);
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
