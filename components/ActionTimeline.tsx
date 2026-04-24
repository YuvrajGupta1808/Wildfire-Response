'use client';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { AlertCircle, Bot, UserCircle, Settings } from 'lucide-react';
import React from 'react';

export default function ActionTimeline() {
  const { timeline } = useAppStore();

  const getIconColor = (type: string) => {
    switch (type) {
      case 'alert': return 'text-red-500';
      case 'agent': return 'text-blue-500';
      case 'user': return 'text-emerald-500';
      case 'system': return 'text-slate-400';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="relative border-l border-stone-200 ml-3 py-2 space-y-5">
      {timeline.map((event, i) => (
        <div key={event.id} className="relative pl-6">
          <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-white flex items-center justify-center border border-stone-200`}>
              <div className={`w-1.5 h-1.5 rounded-full bg-current ${getIconColor(event.type)}`} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[10px] text-stone-500 mb-0.5">
              <span className="uppercase tracking-wider">{event.source}</span>
              <span>&bull;</span>
              <time suppressHydrationWarning>{format(new Date(event.timestamp), 'HH:mm:ss')}</time>
            </div>
            <div className="text-sm text-stone-800 leading-relaxed">
              {event.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
