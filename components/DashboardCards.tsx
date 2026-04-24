'use client';

import { AlertTriangle, CheckCircle2, FileCheck2, Globe2, PhoneCall } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function DashboardCards() {
  const { members, approvals, evidence, voiceCalls, incident, sources } = useAppStore();
  const sourceCount = incident ? sources.filter((s) => s.incidentId === incident.id).length : sources.length;
  const unresolved = members.filter((member) => ['unknown', 'unreachable', 'needs_pickup', 'needs_medical_help'].includes(member.status)).length;
  const pending = approvals.filter((approval) => approval.status === 'pending').length;

  const cards = [
    {
      label: 'Evacuation status',
      value: incident?.evacuationStatus?.replaceAll('_', ' ') ?? 'Unknown',
      detail: incident?.lastRefreshedAt ? `Updated ${new Date(incident.lastRefreshedAt).toLocaleTimeString()}` : 'No monitor run yet',
      icon: AlertTriangle,
      tone: 'orange',
    },
    {
      label: 'Family unresolved',
      value: unresolved.toString(),
      detail: `${members.length} tracked people and pets`,
      icon: CheckCircle2,
      tone: 'stone',
    },
    {
      label: 'Pending approvals',
      value: pending.toString(),
      detail: 'External actions require consent',
      icon: FileCheck2,
      tone: 'blue',
    },
    {
      label: 'Source links',
      value: sourceCount.toString(),
      detail: 'TinyFish Search after monitor',
      icon: Globe2,
      tone: 'orange',
    },
    {
      label: 'Voice records',
      value: voiceCalls.length.toString(),
      detail: `${evidence.length} proof items`,
      icon: PhoneCall,
      tone: 'emerald',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">{card.label}</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 text-2xl font-semibold capitalize tracking-tight text-stone-950">{card.value}</div>
            <div className="mt-1 text-sm text-stone-500">{card.detail}</div>
          </div>
        );
      })}
    </div>
  );
}
