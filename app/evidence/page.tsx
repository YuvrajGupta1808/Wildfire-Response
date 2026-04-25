'use client';

import { History, ShieldCheck } from 'lucide-react';
import AppShell from '@/components/AppShell';
import ActionTimeline from '@/components/ActionTimeline';
import ProofVault from '@/components/ProofVault';
import { useAppStore } from '@/lib/store';

export default function EvidencePage() {
  const { auditEvents } = useAppStore();

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Evidence</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Proof packet and audit trail</h2>
        </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <section className="min-w-0 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            Proof Vault
          </div>
          <ProofVault />
        </section>

        <section className="min-w-0 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <History className="h-4 w-4 text-stone-600" />
            Audit Events
          </div>
          <div className="space-y-3">
            {auditEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{event.permissionScope}</div>
                  <div className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-stone-600">{event.decision}</div>
                </div>
                <div className="mt-2 text-sm font-semibold text-stone-950">{event.toolCall}</div>
                <p className="mt-1 text-sm text-stone-600">{event.outcome}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 text-sm font-semibold text-stone-800">Timeline</div>
          <ActionTimeline />
        </section>
      </div>
      </div>
    </AppShell>
  );
}
