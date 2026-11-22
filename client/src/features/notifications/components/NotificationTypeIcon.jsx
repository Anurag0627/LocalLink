import { Bell, CalendarCheck, Star, Info } from 'lucide-react';

export default function NotificationTypeIcon({ type }) {
  if (typeof type === 'string' && type.startsWith('BOOKING_')) {
    return <CalendarCheck size={18} className="text-indigo-600" />;
  }
  if (typeof type === 'string' && type.startsWith('REVIEW_')) {
    return <Star size={18} className="text-amber-500" />;
  }
  if (type === 'SYSTEM') {
    return <Info size={18} className="text-slate-600" />;
  }
  return <Bell size={18} className="text-slate-500" />;
}
