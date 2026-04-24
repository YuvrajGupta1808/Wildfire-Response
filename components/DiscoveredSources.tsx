'use client';

import { ExternalLink, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function DiscoveredSources() {
  const { sources, incident, agentRuns } = useAppStore();
  const forIncident = incident ? sources.filter((s) => s.incidentId === incident.id) : [];
  const lastRun = [...agentRuns].reverse().find((r) => r.status === 'completed');
  const tinyFishSummary =
    lastRun?.resultSummary?.includes('TinyFish') === true ? lastRun.resultSummary : null;
  const fromTinyFish =
    Boolean(tinyFishSummary) ||
    lastRun?.sponsorTool === 'TinyFish Search' ||
    lastRun?.sponsorTool === 'TinyFish Fetch';

  if (forIncident.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <Search className="h-4 w-4 text-orange-600" />
          Discovered sources (TinyFish)
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Click <span className="font-semibold text-stone-700">Start monitor</span> in the header. With{' '}
          <code className="rounded bg-stone-200 px-1 text-[11px]">TINYFISH_API_KEY</code> set, Search fills this list and
          Fetch adds long summaries under Recent Proof.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-800">
          <Search className="h-4 w-4 text-orange-600" />
          Discovered sources
          {fromTinyFish ? (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-800">
              TinyFish
            </span>
          ) : (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
              Demo seed
            </span>
          )}
        </div>
        <span className="text-xs text-stone-500">{forIncident.length} links</span>
      </div>
      {tinyFishSummary ? (
        <p className="mb-3 text-xs text-stone-600">{tinyFishSummary}</p>
      ) : null}
      <ul className="divide-y divide-stone-100">
        {forIncident.map((s) => (
          <li key={s.id} className="flex gap-3 py-3 first:pt-0">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-stone-900">{s.title}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-stone-500">{s.extractedSummary || '—'}</div>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-600"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{s.url}</span>
              </a>
            </div>
            <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-semibold uppercase text-stone-600">
              {s.sourceType}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
