import { CalendarDays, MapPin } from 'lucide-react';

interface EventPayload { title?: string; date?: string; location?: string; registered?: boolean; }

export default function EventCard({ payload }: { payload: Record<string, unknown> }) {
  const event = payload as EventPayload;
  return <div className="mt-6 bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl relative"><div className="absolute top-0 left-0 w-1 h-full bg-blue-500" /><div className="p-5 flex gap-5 items-center"><div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20"><CalendarDays className="w-6 h-6 text-blue-400" /></div><div className="flex-1"><h4 className="font-semibold text-slate-100 text-base">{event.title ?? 'Event'}</h4><p className="text-xs text-slate-400 mt-1.5 flex items-center gap-3"><span>{event.date ?? 'Date unavailable'}</span>{event.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" />{event.location}</span>}</p></div></div>{event.registered !== undefined && <div className="bg-slate-950/50 px-5 py-3.5 border-t border-slate-800/80 text-xs text-emerald-400 font-medium">{event.registered ? 'Registration Confirmed' : 'Registration Required'}</div>}</div>;
}
