import type { UICard } from '../types/api';
import EventCard from './cards/EventCard';
import ScheduleCard from './cards/ScheduleCard';

export default function CardRenderer({ cards }: { cards: UICard[] }) {
  return <>{cards.map((card, index) => { if (card.type === 'event') return <EventCard key={`${card.type}-${index}`} payload={card.payload} />; if (card.type === 'schedule') return <ScheduleCard key={`${card.type}-${index}`} payload={card.payload} />; return <div key={`${card.type}-${index}`} className="mt-6 glass-panel p-4 rounded-xl text-xs text-slate-400">Unsupported card type: {card.type}</div>; })}</>;
}
