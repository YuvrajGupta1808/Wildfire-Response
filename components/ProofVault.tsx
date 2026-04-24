'use client';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export default function ProofVault() {
  const { evidence } = useAppStore();

  return (
    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
      {evidence.map(proof => (
        <div key={proof.id} className="bg-stone-50 border border-stone-200 p-3 rounded-2xl flex flex-col gap-2">
          <div className="flex items-start justify-between text-[10px]">
            <span suppressHydrationWarning className="text-stone-500 font-mono tracking-widest">
              {format(new Date(proof.timestamp), 'HH:mm:ss')}
            </span>
            <div className="flex items-center gap-1 text-emerald-700 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              {proof.trustLevel}
            </div>
          </div>
          
          <div className="line-clamp-6 text-sm leading-snug text-stone-800" title={proof.extractedData}>
            {proof.extractedData}
          </div>
          
          {proof.guildTraceId && <div className="text-[10px] text-emerald-700">Guild trace: {proof.guildTraceId}</div>}
          {proof.sourceUrl && (
            <a href={proof.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-orange-700 hover:text-orange-600 mt-1 transition-colors w-fit group">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate max-w-[200px] border-b border-transparent group-hover:border-orange-300">{proof.sourceUrl}</span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
