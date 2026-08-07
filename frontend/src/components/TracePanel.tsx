import { Cpu } from 'lucide-react';

export default function TracePanel({ trace }: { trace: string[] }) {
  if (!trace.length) return null;
  return (
    <details className="mt-6 border border-slate-700/50 rounded-lg group/details cursor-pointer overflow-hidden bg-slate-900/30">
      <summary className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between hover:bg-slate-800/50 hover:text-slate-200 transition-colors list-none select-none"><span className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5" />Execution Details</span><span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">{trace.length} steps</span></summary>
      <div className="px-5 py-4 border-t border-slate-700/50 bg-slate-950/50 text-xs text-slate-300 space-y-3 font-mono">{trace.map((step, index) => <div key={`${step}-${index}`} className="flex items-start gap-3"><div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /></div><span className="leading-relaxed">{step}</span></div>)}</div>
    </details>
  );
}
