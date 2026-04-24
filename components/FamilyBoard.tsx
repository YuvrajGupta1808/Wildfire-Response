'use client';
import { useAppStore } from '@/lib/store';
import { ShieldCheck, Cross, Battery, BatteryFull, MapPin } from 'lucide-react';
import { FamilyMemberStatus } from '@/lib/types';

export default function FamilyBoard() {
  const { members, recordMemberCheckIn } = useAppStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'needs_pickup': return 'bg-red-50 text-red-700 border-red-200';
      case 'needs_medical_help': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'unreachable': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const statusOptions: FamilyMemberStatus[] = ['safe', 'needs_pickup', 'needs_medical_help', 'unreachable', 'unknown'];

  return (
    <div className="flex flex-col gap-3">
      {members.map((member) => (
        <div key={member.id} className={`border rounded-2xl p-3 flex flex-col gap-3 ${member.status === 'needs_pickup' ? 'border-l-4 border-l-red-500 border-y-stone-200 border-r-stone-200 bg-red-50/30' : 'border-stone-200 bg-stone-50/60'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase ${getStatusColor(member.status)}`}>
                {member.name.substring(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-950">{member.name}</p>
                <p className="flex items-center gap-1 text-[11px] text-stone-500 mt-0.5">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  <span className="truncate">{member.location}</span>
                </p>
              </div>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusColor(member.status)}`}>
              {member.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs mt-1 pl-11">
            <div className="flex gap-3">
              {member.batteryLevel !== undefined && (
                <div className="flex items-center gap-1 text-stone-500">
                  {member.batteryLevel > 20 ? <BatteryFull className="w-3.5 h-3.5 text-emerald-600" /> : <Battery className="w-3.5 h-3.5 text-red-600 animate-pulse" />}
                  <span className="text-[11px]">{member.batteryLevel}%</span>
                </div>
              )}
              {member.needs.length > 0 && (
                <div className="flex items-center gap-1 text-stone-500">
                  <Cross className="w-3.5 h-3.5 text-orange-600" />
                  <span className="text-[11px]">{member.needs[0]}</span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-stone-500">
              Seen: {member.lastCheckIn ? new Date(member.lastCheckIn).toLocaleTimeString() : 'No check-in'}
            </div>
          </div>
          <div className="flex items-center gap-2 pl-11">
            <select
              value={member.status}
              onChange={(event) => void recordMemberCheckIn(member.id, event.target.value as FamilyMemberStatus)}
              className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[10px] uppercase tracking-wider text-stone-700 outline-none"
              aria-label={`Update ${member.name} status`}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
            <span className="shrink-0 text-[9px] uppercase tracking-wider text-stone-500">
              {member.updatedBy}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
