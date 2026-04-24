'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Database, FileKey, Map, Mic2, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const navItems = [
  { href: '/', label: 'Monitor', icon: Map },
  { href: '/plan', label: 'Plan', icon: Activity },
  { href: '/voice', label: 'Voice', icon: Mic2 },
  { href: '/evidence', label: 'Evidence', icon: FileKey },
  { href: '/household', label: 'Household', icon: Database },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, incident, household, refreshIncident, startMonitoring, isMonitoring } = useAppStore();

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
        <aside className="hidden w-72 shrink-0 border-r border-stone-200 bg-[#fbfaf7] px-4 py-5 lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d94f21] text-white shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">SafeSignal</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Wildfire response
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-stone-950 text-white shadow-sm'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">Safety note</div>
            <p className="mt-2 text-sm leading-6 text-orange-950">
              Source-backed guidance only. Call 911 or local emergency services for immediate danger.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#f4f1ea]/90 px-4 py-4 backdrop-blur-xl md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-600">
                    {mode === 'live' ? 'Live MVP' : 'Demo fallback'}
                  </span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">
                    Approval gated
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">
                  {incident?.name ?? 'Wildfire family monitor'}
                </h1>
                <p className="mt-1 text-sm text-stone-600">
                  {household?.homeAddress ?? 'Create a household profile to begin monitoring.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/household"
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-stone-400"
                >
                  Edit household
                </Link>
                <button
                  onClick={() => void (isMonitoring ? refreshIncident() : startMonitoring())}
                  className="rounded-xl bg-[#d94f21] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#bd431b]"
                >
                  {isMonitoring ? 'Refresh monitor' : 'Start monitor'}
                </button>
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                      active ? 'bg-stone-950 text-white' : 'bg-white text-stone-600'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
