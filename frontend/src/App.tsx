import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Activity, Bot, CircleAlert, Cpu, Send, Sparkles, User, Wifi } from 'lucide-react';
import { useBackend } from './hooks/useBackend';
import { useChat, type ChatMessage } from './hooks/useChat';
import type { AgentExecution, UICard } from './types/api';

function statusColor(status: string): string {
  if (status === 'running') return 'text-amber-300';
  if (status === 'failed') return 'text-red-300';
  if (status === 'completed') return 'text-emerald-300';
  return 'text-slate-400';
}

function Card({ card }: { card: UICard }) {
  return <div className="card"><div className="eyebrow">{card.type}</div><pre>{JSON.stringify(card.payload, null, 2)}</pre></div>;
}

function LiveStatus({ message }: { message: ChatMessage }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!message.streaming || !message.startedAt) return;
    const update = () => setElapsed(Math.floor((Date.now() - message.startedAt!) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [message.streaming, message.startedAt]);
  const activity = message.activity ?? 'Hermes is working…';
  return <div className="live-status"><span className="live-dot" />{activity}<strong>{elapsed}s</strong></div>;
}

function Message({ message }: { message: ChatMessage }) {
  const assistant = message.role === 'assistant';
  return <article className={`message ${assistant ? 'assistant' : 'user'}`}>
    <div className="avatar">{assistant ? <Bot size={17} /> : <User size={17} />}</div>
    <div className="message-body">
      <div className="message-label">{assistant ? 'Hermes' : 'You'}</div>
      {message.streaming && <LiveStatus message={message} />}
      <div className="message-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown></div>
      {message.error && <div className="error-line"><CircleAlert size={14} />{message.error}</div>}
      {message.cards.length > 0 && <div className="cards">{message.cards.map((card, index) => <Card key={`${card.type}-${index}`} card={card} />)}</div>}
      {message.execution.trace.length > 0 && <details className="trace" open={message.streaming || (assistant && message.text === '')}><summary><Activity size={14} /> Live execution <span>{message.execution.trace.length}</span></summary><div>{message.execution.trace.map((line, index) => <p key={`${line}-${index}`}><span />{line}</p>)}</div></details>}
      {message.sources.length > 0 && <div className="sources"><div className="eyebrow">Sources</div>{message.sources.map((source, index) => source.url ? <a key={`${source.title}-${index}`} href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : <span key={`${source.title}-${index}`}>{source.title}</span>)}</div>}
    </div>
  </article>;
}

function AgentList({ agents }: { agents: AgentExecution[] }) {
  return <div className="agent-list">{agents.length === 0 ? <p className="muted">No agent activity reported yet.</p> : agents.map((agent) => <div className="agent" key={agent.name}><Cpu size={16} /><span>{agent.name}</span><strong className={statusColor(agent.status)}>{agent.status}</strong></div>)}</div>;
}

export default function App() {
  const { messages, agents, isResponding, sendMessage } = useChat();
  const backend = useBackend();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.filter((message) => !message.hidden);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [visibleMessages, isResponding]);

  const submit = () => {
    if (!draft.trim()) return;
    const value = draft;
    setDraft('');
    void sendMessage(value);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={20} /></div><div><h1>AgentX</h1><p>Hermes interface</p></div></div>
      <div className="sidebar-section"><div className="eyebrow">Reported agents</div><AgentList agents={agents} /></div>
      <div className="sidebar-footer"><div className="connection"><Wifi size={15} /><span>FastAPI bridge</span><i className={backend.health === 'online' ? 'online' : 'offline'} /></div><button onClick={() => void backend.refresh()} type="button">Refresh connection</button></div>
    </aside>
    <main className="chat-shell">
      <header className="topbar"><div><div className="eyebrow">Live conversation</div><h2>Smart Campus Assistant</h2></div><div className={`connection-pill ${backend.health}`}><span />{backend.health === 'online' ? 'Connected' : backend.health === 'checking' ? 'Checking' : 'Offline'}</div></header>
      <section className="messages" ref={scrollRef}>{visibleMessages.map((message) => <Message key={message.id} message={message} />)}</section>
      <footer className="composer"><div className="composer-inner"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Ask Hermes something…" rows={1} /><button type="button" disabled={!draft.trim()} onClick={submit} aria-label="Send message"><Send size={17} /></button></div><p>Enter to send · Shift+Enter for a new line · Multiple requests can run concurrently</p></footer>
    </main>
  </div>;
}
