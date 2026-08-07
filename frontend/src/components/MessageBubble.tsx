import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../hooks/useChat';
import CardRenderer from './CardRenderer';
import TracePanel from './TracePanel';

export default function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const assistant = message.role === 'assistant';
  return <div className={`flex gap-4 max-w-4xl mx-auto ${assistant ? '' : 'flex-row-reverse'} ${index === 0 ? 'opacity-70' : ''}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${assistant ? 'bg-gradient-to-tr from-purple-600 to-blue-500 shadow-lg shadow-purple-500/30' : 'bg-blue-500/20 border border-blue-500/30'}`}>{assistant ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-blue-400" />}</div>
    <div className={`max-w-[85%] ${assistant ? 'space-y-4' : 'bg-blue-600/20 border border-blue-500/30 px-5 py-3.5 rounded-2xl rounded-tr-none shadow-lg'}`}>
      {assistant ? <div className="glass-panel px-6 py-5 rounded-2xl rounded-tl-none shadow-xl border-white/10 relative overflow-hidden"><div className="text-slate-200 text-sm leading-relaxed prose prose-invert prose-p:leading-relaxed prose-pre:bg-slate-800/50 prose-pre:border prose-pre:border-slate-700/50 max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown></div><CardRenderer cards={message.cards ?? []} /><TracePanel trace={message.execution?.trace ?? []} />{message.sources && message.sources.length > 0 && <div className="mt-5 border-t border-white/10 pt-4"><p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Sources</p><div className="space-y-1">{message.sources.map((source, sourceIndex) => <div key={`${source.title}-${sourceIndex}`} className="text-xs text-slate-400">{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="hover:text-slate-200 underline">{source.title}</a> : source.title}</div>)}</div></div>}</div> : <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>}
    </div>
  </div>;
}
