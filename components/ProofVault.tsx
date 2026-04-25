'use client';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const markdownComponents: Components = {
  a: ({ node: _node, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer" className="text-orange-700 underline decoration-orange-300/60 underline-offset-2 hover:text-orange-600" />
  ),
};

export default function ProofVault() {
  const { evidence } = useAppStore();

  return (
    <div className="flex min-w-0 flex-col gap-3 max-h-[min(75vh,780px)] overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
      {evidence.map(proof => (
        <div
          key={proof.id}
          className="flex min-w-0 flex-col gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3"
        >
          <div className="flex items-start justify-between text-[10px]">
            <span suppressHydrationWarning className="text-stone-500 font-mono tracking-widest">
              {format(new Date(proof.timestamp), 'HH:mm:ss')}
            </span>
            <div className="flex items-center gap-1 text-emerald-700 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              {proof.trustLevel}
            </div>
          </div>
          
          <div
            className="max-h-[min(50vh,320px)] min-w-0 overflow-y-auto overflow-x-auto text-sm leading-snug text-stone-800 prose prose-sm prose-stone max-w-none prose-p:my-1 prose-headings:my-1.5 prose-headings:font-semibold prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:max-w-full prose-pre:overflow-x-auto"
            title={proof.extractedData}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {proof.extractedData}
            </ReactMarkdown>
          </div>
          
          {proof.guildTraceId && <div className="text-[10px] text-emerald-700">Guild trace: {proof.guildTraceId}</div>}
          {proof.sourceUrl && (
            <a
              href={proof.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="group mt-1 flex min-w-0 max-w-full items-center gap-1 text-[10px] text-orange-700 transition-colors hover:text-orange-600"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="min-w-0 break-all border-b border-transparent group-hover:border-orange-300">{proof.sourceUrl}</span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
