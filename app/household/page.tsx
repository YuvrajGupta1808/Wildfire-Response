'use client';

import dynamic from 'next/dynamic';
import { Database } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { useAppStore } from '@/lib/store';

const blockLoading = () => (
  <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-sm text-stone-500">
    Loading…
  </div>
);

const HouseholdOnboarding = dynamic(() => import('@/components/HouseholdOnboarding'), { ssr: false, loading: blockLoading });
const FamilyBoard = dynamic(() => import('@/components/FamilyBoard'), { ssr: false, loading: blockLoading });

export default function HouseholdPage() {
  const { household } = useAppStore();

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Household</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Profile, contacts, needs, and consent</h2>
        </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Database className="h-4 w-4 text-orange-700" />
            Household Setup
          </div>
          <HouseholdOnboarding />
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Saved Profile</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">{household?.name ?? 'No household'}</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {household?.emergencyPreferences?.accessibilityNotes ?? '—'}
            </p>
          </div>
          <FamilyBoard />
        </section>
      </div>
      </div>
    </AppShell>
  );
}
