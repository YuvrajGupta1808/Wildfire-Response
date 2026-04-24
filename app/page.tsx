'use client';

import dynamic from 'next/dynamic';
import { Activity, FileKey, ListTodo, Map as MapIcon, ShieldCheck } from 'lucide-react';
import AppShell from '@/components/AppShell';
import DashboardCards from '@/components/DashboardCards';
import DiscoveredSources from '@/components/DiscoveredSources';

const blockLoading = () => (
  <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-sm text-stone-500">
    Loading…
  </div>
);

const IncidentMap = dynamic(() => import('@/components/IncidentMap'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-stone-100 text-sm text-stone-500">Loading map...</div>,
});
const FamilyBoard = dynamic(() => import('@/components/FamilyBoard'), { ssr: false, loading: blockLoading });
const ActionTimeline = dynamic(() => import('@/components/ActionTimeline'), { ssr: false, loading: blockLoading });
const ApprovalQueue = dynamic(() => import('@/components/ApprovalQueue'), { ssr: false, loading: blockLoading });
const ProofVault = dynamic(() => import('@/components/ProofVault'), { ssr: false, loading: blockLoading });

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-5">
        <DashboardCards />

        <DiscoveredSources />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.75fr)]">
          <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <MapIcon className="h-4 w-4 text-orange-600" />
                Incident Map
              </div>
              <span className="text-xs font-medium text-stone-500">Official sources first</span>
            </div>
            <div className="relative h-[560px]">
              <IncidentMap />
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Family Status
              </div>
              <FamilyBoard />
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-800">
                <ListTodo className="h-4 w-4 text-blue-600" />
                Approval Queue
              </div>
              <ApprovalQueue />
            </section>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-800">
              <Activity className="h-4 w-4 text-stone-600" />
              Action Timeline
            </div>
            <ActionTimeline />
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-800">
              <FileKey className="h-4 w-4 text-orange-600" />
              Recent Proof
            </div>
            <ProofVault />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
