'use client';

import { Activity, FileKey, ListTodo, Map as MapIcon, ShieldCheck } from 'lucide-react';
import ActionTimeline from '@/components/ActionTimeline';
import ApprovalQueue from '@/components/ApprovalQueue';
import AppShell from '@/components/AppShell';
import DashboardCards from '@/components/DashboardCards';
import DiscoveredSources from '@/components/DiscoveredSources';
import FamilyBoard from '@/components/FamilyBoard';
import IncidentMap from '@/components/IncidentMap';
import ProofVault from '@/components/ProofVault';

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-5">
        <DashboardCards />

        <DiscoveredSources />

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.75fr)] xl:items-start">
          <section className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <MapIcon className="h-4 w-4 text-orange-600" />
                Incident Map
              </div>
              <span className="text-xs font-medium text-stone-500">Official sources first</span>
            </div>
            <div className="relative isolate h-[min(560px,70vh)] w-full min-h-[280px] shrink-0 overflow-hidden bg-stone-100 sm:h-[560px]">
              <IncidentMap />
            </div>
          </section>

          <div className="min-w-0 space-y-5">
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

        <div className="grid min-w-0 gap-5 xl:grid-cols-2 xl:items-start">
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
