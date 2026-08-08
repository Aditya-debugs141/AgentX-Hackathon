import { Server, Sparkles, ChevronLeft } from "lucide-react";
import type { AgentExecution } from "../types/api";
import type { BackendHealth } from "../hooks/useBackend";
import AgentStatus from "./AgentStatus";

export default function Sidebar({
  agents,
  health,
  onBack,
}: {
  agents: AgentExecution[];
  health: BackendHealth;
  onBack: () => void;
}) {
  return (
    <aside className="w-72 flex flex-col border-r border-white/5 bg-slate-900/60 backdrop-blur-2xl z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
      
      <div className="p-6 flex flex-col gap-6 h-full relative z-10">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="group flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors duration-200 self-start bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] shrink-0 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight glow-text leading-tight">
              Dosth
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
              Hermes Core
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
              Active Agents
            </h3>
            <div className="space-y-3">
              {agents.length ? (
                agents.map((agent, index) => (
                  <AgentStatus
                    key={`${agent.name}-${index}`}
                    agent={agent}
                    delay={index * 0.08}
                  />
                ))
              ) : (
                <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Hermes has not reported agent activity yet. Send a message to start.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            System Resources
          </h3>
          <div className="glass-panel p-3.5 rounded-xl flex items-center justify-between bg-slate-950/50 border border-white/5 ring-1 ring-white/5 shadow-inner">
            <div className="flex items-center gap-2.5 text-xs font-medium text-slate-300">
              <div className={`p-1.5 rounded-lg ${health === "online" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                <Server className={`w-3.5 h-3.5 ${health === "online" ? "text-emerald-400" : "text-red-400"}`} />
              </div>
              FastAPI Bridge
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-1 rounded-md font-semibold tracking-wide ${health === "online" ? "text-emerald-400 bg-emerald-400/10 ring-1 ring-emerald-400/20" : health === "offline" ? "text-red-400 bg-red-400/10 ring-1 ring-red-400/20" : "text-yellow-400 bg-yellow-400/10"}`}
            >
              {health === "online"
                ? "ONLINE"
                : health === "offline"
                  ? "OFFLINE"
                  : "CHECKING..."}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
