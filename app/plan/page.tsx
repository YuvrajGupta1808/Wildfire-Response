'use client';

import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ListTodo, Route } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { useAppStore } from '@/lib/store';

const blockLoading = () => (
  <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-sm text-stone-500">
    Loading…
  </div>
);

const ApprovalQueue = dynamic(() => import('@/components/ApprovalQueue'), { ssr: false, loading: blockLoading });
const ResourceCards = dynamic(() => import('@/components/ResourceCards'), { ssr: false, loading: blockLoading });

export default function PlanPage() {
  const { nextActions, resources } = useAppStore();

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Response Plan</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Actions, approvals, and matched resources</h2>
        </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Current Plan</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Next three actions</h2>
            </div>
            <Route className="h-5 w-5 text-orange-600" />
          </div>
          <div className="space-y-3">
            {nextActions.map((action, index) => (
              <div key={action} className="flex gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div>
                  <div className="font-semibold text-stone-950">{action}</div>
                  <div className="mt-1 text-sm text-stone-500">Backed by monitored source records and approval-gated execution.</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <ListTodo className="h-4 w-4 text-blue-700" />
            Approval Queue
          </div>
          <ApprovalQueue />
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Matched Resources</div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">Shelters, roads, outages, and charging</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {resources.length} available
            </div>
          </div>
          <ResourceCards />
          <div className="mt-5 flex items-center gap-2 text-sm text-stone-500">
            <ArrowRight className="h-4 w-4" />
            External shelter forms are prepared as drafts only in this MVP.
          </div>
        </section>
      </div>
      </div>
    </AppShell>
  );
}
