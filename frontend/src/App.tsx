import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Cpu, Briefcase, Calendar as CalendarIcon, Server, Library, Sparkles, Loader2, BookOpen, Clock, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize';

// Resolve the API base URL once. Vite substitutes import.meta.env at build time;
// an unset variable must therefore not fall back to localhost in a deployment.
// The Vercel deployment serves the frontend and API from the same origin.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

// Read the optional frontend API key from environment variables.
// This key is required if the backend has WEB_API_KEY set.
const WEB_API_KEY = import.meta.env.VITE_WEB_API_KEY;

// Safe deployment diagnostics: report presence and routing mode, never values.
console.info('[AgentX config]', {
  mode: import.meta.env.MODE,
  apiBaseUrlConfigured: Boolean(import.meta.env.VITE_API_BASE_URL),
  apiRouting: API_BASE_URL ? API_BASE_URL : 'same-origin',
  webApiKeyConfigured: Boolean(WEB_API_KEY),
});

function App() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ id: string, role: 'user' | 'agent', text: string, ui_card?: 'event' | 'schedule' | null, trace?: string[] }[]>([
    { id: 'msg-init', role: 'agent', text: 'System initialized. I am your Smart Campus Assistant powered by the Hermes Orchestrator Engine. How can I help you today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId] = useState('conv_' + Math.random().toString(36).substring(7));
  const [activeAgent, setActiveAgent] = useState<'Orchestrator' | 'Placement Agent' | 'Events Agent' | 'Knowledge Agent'>('Orchestrator');

  const agentKeywords: Record<string, 'Placement Agent' | 'Events Agent' | 'Knowledge Agent'> = {
    'placement': 'Placement Agent', 'job': 'Placement Agent', 'career': 'Placement Agent', 'company': 'Placement Agent', 'google': 'Placement Agent',
    'event': 'Events Agent', 'workshop': 'Events Agent', 'register': 'Events Agent',
    'course': 'Knowledge Agent', 'schedule': 'Knowledge Agent', 'attendance': 'Knowledge Agent', 'student': 'Knowledge Agent'
  };
  const scrollRef = useRef<HTMLDivElement>(null);

  // Backend health check state
  const [backendHealth, setBackendHealth] = useState<'checking' | 'online' | 'offline'>('checking');

  // Health check polling
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setBackendHealth('online');
      } else {
        setBackendHealth('offline');
      }
    } catch {
      setBackendHealth('offline');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    // Detect active agent based on prompt
    const lowerCasePrompt = prompt.toLowerCase();
    let detectedAgent: 'Orchestrator' | 'Placement Agent' | 'Events Agent' | 'Knowledge Agent' = 'Orchestrator';
    for (const keyword in agentKeywords) {
      if (lowerCasePrompt.includes(keyword)) {
        detectedAgent = agentKeywords[keyword];
        break;
      }
    }
    setActiveAgent(detectedAgent);

    const userMessage = prompt;
    setPrompt('');
    const userMsgId = `${conversationId}-user-${messages.length}`;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      // Securely add the API key header if it's defined in the environment.
      if (WEB_API_KEY) {
        headers['x-api-key'] = WEB_API_KEY;
      }

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          conversation_id: conversationId,
          message: userMessage
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Backend error:', response.status, errBody);
        throw new Error(errBody || `Request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Determine if we should show a rich card based on keywords
      let cardType: 'event' | 'schedule' | null = null;
      if (data.reply.toLowerCase().includes('google') || data.reply.toLowerCase().includes('workshop')) cardType = 'event';
      if (data.reply.toLowerCase().includes('schedule') || data.reply.toLowerCase().includes('course')) cardType = 'schedule';
      
      setMessages(prev => [...prev, { 
        id: `${conversationId}-agent-${prev.length}`,
        role: 'agent', 
        text: data.reply, 
        ui_card: cardType,
        trace: data.trace
      }]);

    } catch (error) {
      console.error('Error fetching from backend:', error);
      setMessages(prev => [...prev, { 
        id: `${conversationId}-err-${prev.length}`,
        role: 'agent', 
        text: `Connection to Hermes Agent failed. Please check the backend console for errors. \n\n**Details:**\n\`\`\`\n${error instanceof Error ? error.message : 'An unknown error occurred.'}\n\`\`\``
      }]);
      setBackendHealth('offline');
    } finally {
      setActiveAgent('Orchestrator'); // Reset to default after response
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-100 font-sans selection:bg-purple-500/30">
      
      {/* Sidebar - Agent Status */}
      <aside className="w-72 p-6 flex flex-col gap-6 border-r border-white/5 bg-slate-900/40 backdrop-blur-xl z-20 shadow-2xl">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight glow-text leading-tight">AgentX</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Hermes Core</p>
          </div>
        </motion.div>

        <div className="flex-1 space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Active Agents</h3>
            
            <div className="space-y-3">
              <AgentStatus icon={Cpu} name="Orchestrator" status={isTyping && activeAgent === 'Orchestrator' ? 'Active' : 'Idle'} statusColor={isTyping && activeAgent === 'Orchestrator' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'} delay={0.1} />
              <AgentStatus icon={Briefcase} name="Placement Agent" status={isTyping && activeAgent === 'Placement Agent' ? 'Active' : 'Sleeping'} statusColor={isTyping && activeAgent === 'Placement Agent' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'} delay={0.2} />
              <AgentStatus icon={CalendarIcon} name="Events Agent" status={isTyping && activeAgent === 'Events Agent' ? 'Active' : 'Sleeping'} statusColor={isTyping && activeAgent === 'Events Agent' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'} delay={0.3} />
              <AgentStatus icon={Library} name="Knowledge Agent" status={isTyping && activeAgent === 'Knowledge Agent' ? 'Active' : 'Sleeping'} statusColor={isTyping && activeAgent === 'Knowledge Agent' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'} delay={0.4} />
            </div>
          </motion.div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">System Resources</h3>
          <div className="glass-panel p-3 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              FastAPI Bridge
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              backendHealth === 'online' 
                ? 'text-emerald-400 bg-emerald-400/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                : backendHealth === 'offline'
                ? 'text-red-400 bg-red-400/10 shadow-[0_0_10px_rgba(248,113,113,0.2)]'
                : 'text-yellow-400 bg-yellow-400/10'
            }`}>{backendHealth === 'online' ? 'Online' : backendHealth === 'offline' ? 'Offline' : 'Checking...'}</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-[#0B0E14] to-[#13161c]">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <header className="h-16 border-b border-white/5 flex items-center px-8 backdrop-blur-md z-10 sticky top-0 bg-slate-900/30">
          <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            Session Secure
          </h2>
        </header>

        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 pb-40 scroll-smooth relative z-10">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} ${idx === 0 ? 'opacity-70' : ''}`}
              >
                
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  msg.role === 'user' 
                    ? 'bg-blue-500/20 border border-blue-500/30' 
                    : 'bg-gradient-to-tr from-purple-600 to-blue-500 shadow-lg shadow-purple-500/30'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-blue-400" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                
                <div className={`max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-blue-600/20 border border-blue-500/30 px-5 py-3.5 rounded-2xl rounded-tr-none shadow-lg' 
                    : 'space-y-4'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="glass-panel px-6 py-5 rounded-2xl rounded-tl-none shadow-xl border-white/10 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                      
                      <div className="text-slate-200 text-sm leading-relaxed prose prose-invert prose-p:leading-relaxed prose-pre:bg-slate-800/50 prose-pre:border prose-pre:border-slate-700/50 max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                      
                      {/* --- RICH UI CARDS --- */}
                      
                      {/* Event Card */}
                      {msg.ui_card === 'event' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                          className="mt-6 bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl relative group/card hover:border-slate-600 transition-colors"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                          <div className="p-5 flex gap-5 items-center">
                            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex flex-col items-center justify-center shrink-0 border border-blue-500/20 shadow-inner">
                              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Aug</span>
                              <span className="text-xl font-black text-slate-100 leading-none mt-0.5">08</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-100 text-base">Google Placement Strategy Workshop</h4>
                              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-3">
                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /> 10:00 AM - 12:00 PM</span>
                                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" /> Main Auditorium</span>
                              </p>
                            </div>
                          </div>
                          <div className="bg-slate-950/50 px-5 py-3.5 border-t border-slate-800/80 flex justify-between items-center backdrop-blur-sm">
                            <span className="text-xs text-emerald-400 font-medium flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              Registration Confirmed
                            </span>
                            <button className="text-xs bg-white text-slate-900 hover:bg-slate-200 px-4 py-2 rounded-lg transition-all font-semibold shadow-sm hover:shadow-md active:scale-95">
                              Add to Calendar
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Course Schedule Card */}
                      {msg.ui_card === 'schedule' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                          className="mt-6 glass-panel rounded-xl overflow-hidden shadow-2xl relative"
                        >
                          <div className="bg-slate-800/40 px-4 py-3 border-b border-white/5 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-purple-400" />
                            <h4 className="font-medium text-sm text-slate-200">Suggested Course Schedule</h4>
                          </div>
                          <div className="divide-y divide-white/5">
                            <div className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                              <div>
                                <h5 className="text-sm font-medium text-slate-200">CS401: Advanced AI</h5>
                                <p className="text-xs text-slate-400 mt-1">Prof. Alan Turing • Credits: 4</p>
                              </div>
                              <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">Mon/Wed 10AM</span>
                            </div>
                            <div className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                              <div>
                                <h5 className="text-sm font-medium text-slate-200">CS405: Cloud Computing</h5>
                                <p className="text-xs text-slate-400 mt-1">Prof. Grace Hopper • Credits: 3</p>
                              </div>
                              <span className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">Tue/Thu 2PM</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Execution Details (Trace Accordion) */}
                      {msg.trace && msg.trace.length > 0 && (
                        <details className="mt-6 border border-slate-700/50 rounded-lg group/details cursor-pointer overflow-hidden bg-slate-900/30">
                          <summary className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between hover:bg-slate-800/50 hover:text-slate-200 transition-colors list-none select-none">
                            <span className="flex items-center gap-2">
                              <Cpu className="w-3.5 h-3.5" />
                              Execution Details
                            </span>
                            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">{msg.trace.length} steps</span>
                          </summary>
                          <div className="px-5 py-4 border-t border-slate-700/50 bg-slate-950/50 text-xs text-slate-300 space-y-3 font-mono relative">
                             <div className="absolute left-[29px] top-6 bottom-6 w-px bg-slate-700/50"></div>
                             {msg.trace.map((step: string, i: number) => (
                               <div key={i} className="flex items-start gap-3 relative z-10">
                                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                  </div>
                                  <span className="leading-relaxed">{step}</span>
                               </div>
                             ))}
                          </div>
                        </details>
                      )}

                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
             <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 max-w-4xl mx-auto"
             >
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shrink-0 opacity-80 shadow-[0_0_15px_rgba(139,92,246,0.5)] mt-1">
                 <Loader2 className="w-4 h-4 text-white animate-spin" />
               </div>
               <div className="glass-panel px-5 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
               </div>
             </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14] to-transparent z-20">
          <div className="max-w-4xl mx-auto relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/10 to-transparent rounded-3xl blur-2xl opacity-60"></div>
            
            <div className="relative glass-panel rounded-3xl p-2 flex items-end gap-2 shadow-2xl border border-white/10 ring-1 ring-white/5 transition-all focus-within:ring-white/20 focus-within:border-white/20 bg-slate-900/60">
              <TextareaAutosize 
                minRows={1}
                maxRows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message AgentX..."
                className="flex-1 bg-transparent border-none text-slate-200 px-4 py-3 focus:outline-none text-sm placeholder:text-slate-500 resize-none leading-relaxed"
              />
              <button 
                onClick={handleSend}
                disabled={!prompt.trim() || isTyping}
                className="bg-white disabled:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 p-3 rounded-2xl hover:bg-slate-200 transition-all shadow-sm mb-0.5 mr-0.5 hover:shadow-md active:scale-95 group"
              >
                <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            
            <div className="text-center mt-3 flex items-center justify-center gap-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-purple-400/70" />
                Powered by Hermes Framework
              </p>
            </div>
          </div>
        </div>

        {/* Backend Health Indicator - Bottom Left */}
        <button
          onClick={checkHealth}
          title={`Backend: ${backendHealth}`}
          className="fixed bottom-6 left-[19.5rem] z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md shadow-lg hover:bg-slate-800/80 transition-all cursor-pointer group"
        >
          <span className="relative flex h-3 w-3">
            {backendHealth === 'online' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              backendHealth === 'online'
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                : backendHealth === 'offline'
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse'
            }`}></span>
          </span>
          <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
            backendHealth === 'online' ? 'text-emerald-400' : backendHealth === 'offline' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {backendHealth === 'online' ? 'API Online' : backendHealth === 'offline' ? 'API Offline' : 'Checking...'}
          </span>
        </button>
      </main>
    </div>
  );
}

function AgentStatus({ icon: Icon, name, status, statusColor, delay }: { icon: any, name: string, status: string, statusColor: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      className="glass-panel p-3 rounded-xl flex items-center justify-between group hover:border-white/10 transition-all cursor-default hover:bg-white/[0.02]"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center border border-slate-700/50 group-hover:border-slate-500/50 transition-colors shadow-inner">
          <Icon className="w-4 h-4 text-slate-300" />
        </div>
        <span className="text-sm font-medium text-slate-200">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{status}</span>
        <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] opacity-80 ${statusColor}`}></span>
      </div>
    </motion.div>
  );
}

export default App;
