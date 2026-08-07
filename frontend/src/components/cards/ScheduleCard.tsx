import { BookOpen } from 'lucide-react';

export default function ScheduleCard({ payload }: { payload: Record<string, unknown> }) {
  const title = typeof payload.title === 'string' ? payload.title : 'Suggested Course Schedule';
  const items = Array.isArray(payload.items) ? payload.items : [];
  return <div className="mt-6 glass-panel rounded-xl overflow-hidden shadow-2xl relative"><div className="bg-slate-800/40 px-4 py-3 border-b border-white/5 flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-400" /><h4 className="font-medium text-sm text-slate-200">{title}</h4></div><div className="divide-y divide-white/5">{items.map((item, index) => { const row = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {}; return <div key={index} className="p-4 flex justify-between items-center"><div><h5 className="text-sm font-medium text-slate-200">{String(row.name ?? row.title ?? 'Course')}</h5><p className="text-xs text-slate-400 mt-1">{String(row.details ?? '')}</p></div><span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">{String(row.time ?? '')}</span></div>; })}</div></div>;
}
