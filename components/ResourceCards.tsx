'use client';
import { useAppStore } from '@/lib/store';
import { Dog, ExternalLink, HeartPulse, Home, MapPin, PlugZap, Route, Zap } from 'lucide-react';

export default function ResourceCards() {
  const { resources, isMonitoring } = useAppStore();

  const getIcon = (type: string) => {
    switch(type) {
      case 'shelter': return <Home className="w-5 h-5" />;
      case 'animal_shelter': return <Dog className="w-5 h-5" />;
      case 'charging': return <Zap className="w-5 h-5" />;
      case 'aid': return <HeartPulse className="w-5 h-5" />;
      case 'road_closure': return <Route className="w-5 h-5" />;
      case 'outage': return <PlugZap className="w-5 h-5" />;
      default: return <Home className="w-5 h-5" />;
    }
  };

  if (!isMonitoring) {
     return <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 py-6 text-center text-[11px] font-bold uppercase tracking-widest text-stone-400">Waiting for monitor...</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {resources.map(res => (
        <div key={res.id} className="flex gap-3 items-center bg-stone-50 p-3 rounded-2xl border border-stone-200">
           <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-700">
             {getIcon(res.type)}
           </div>
           <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-semibold text-stone-950 truncate pr-2">{res.name}</p>
                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-bold">
                  {res.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/> {res.distance}</span>
                {res.capacity && <span>&bull; {res.capacity}</span>}
                {res.acceptsPets && <span className="text-emerald-400 font-medium">Pets OK</span>}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-stone-500">
                <span>Confidence {Math.round(res.confidence * 100)}%</span>
                {res.url && (
                  <a href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-orange-700 hover:text-orange-600">
                    <ExternalLink className="h-3 w-3" /> Source
                  </a>
                )}
              </div>
           </div>
        </div>
      ))}
    </div>
  );
}
