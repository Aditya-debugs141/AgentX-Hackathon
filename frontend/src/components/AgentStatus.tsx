import type { AgentExecution } from '../types/api';
import { Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

function statusStyles(status: string) {
  if (status === 'running') return { text: 'Running', dot: 'bg-emerald-400 animate-pulse' };
  if (status === 'failed') return { text: 'Failed', dot: 'bg-red-400' };
  if (status === 'completed') return { text: 'Completed', dot: 'bg-blue-400' };
  return { text: status || 'Idle', dot: 'bg-slate-600' };
}

export default function AgentStatus({ agent, delay = 0 }: { agent: AgentExecution; delay?: number }) {
  const style = statusStyles(agent.status);
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className="glass-panel p-3 rounded-xl flex items-center justify-between group hover:border-white/10 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center border border-slate-700/50 shrink-0">
          <Cpu className="w-4 h-4 text-slate-300" />
        </div>
        <span className="text-sm font-medium text-slate-200 truncate">{agent.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{style.text}</span>
        <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] opacity-80 ${style.dot}`}></span>
      </div>
    </motion.div>
  );
}
