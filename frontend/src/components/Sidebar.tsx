import { Server, Sparkles } from "lucide-react";
import type { AgentExecution } from "../types/api";
import type { BackendHealth } from "../hooks/useBackend";
import AgentStatus from "./AgentStatus";

export default function Sidebar({
  agents,
  health,
}: {
  agents: AgentExecution[];
  health: BackendHealth;
}) {
  return (
    <aside className="w-72 p-6 flex flex-col gap-6 border-r border-white/5 bg-slate-900/40 backdrop-blur-xl z-20 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] shrink-0">
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

      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
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
              <p className="text-xs text-slate-500">
                Hermes has not reported agent activity yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
          System Resources
        </h3>
        <div className="glass-panel p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            FastAPI Bridge
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded ${health === "online" ? "text-emerald-400 bg-emerald-400/10" : health === "offline" ? "text-red-400 bg-red-400/10" : "text-yellow-400 bg-yellow-400/10"}`}
          >
            {health === "online"
              ? "Online"
              : health === "offline"
                ? "Offline"
                : "Checking..."}
          </span>
        </div>
      </div>
    </aside>
  );
}
