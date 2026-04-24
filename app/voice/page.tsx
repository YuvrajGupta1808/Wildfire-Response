'use client';

import dynamic from 'next/dynamic';
import { PhoneCall } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { useAppStore } from '@/lib/store';

const VoiceCommandCenter = dynamic(() => import('@/components/VoiceCommandCenter'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-sm text-stone-500">
      Loading voice…
    </div>
  ),
});

export default function VoicePage() {
  const { voiceCalls } = useAppStore();

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Voice Command Center</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Family calls, check-ins, and transcripts</h2>
        </div>
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <VoiceCommandCenter />
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <PhoneCall className="h-4 w-4 text-blue-700" />
            Call History
          </div>
          <div className="space-y-3">
            {voiceCalls.map((call) => (
              <div key={call.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-stone-950">{call.memberName ?? 'Household line'}</div>
                  <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-600">
                    {call.direction} · {call.status}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">{call.transcript || call.outcome}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      </div>
    </AppShell>
  );
}
