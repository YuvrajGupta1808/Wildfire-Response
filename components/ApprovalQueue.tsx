'use client';
import { useAppStore } from '@/lib/store';
import type { ApprovalRequest } from '@/lib/types';
import { AlertTriangle, CheckCircle2, FileText, ShieldX } from 'lucide-react';

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(', ');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function PlannedActionDetails({ action }: { action: ApprovalRequest }) {
  const p = action.preparedPayload;

  if (action.actionType === 'send_family_alert') {
    const recipients = Array.isArray(p.recipients) ? (p.recipients as unknown[]).map(String) : [];
    return (
      <dl className="space-y-2 text-xs text-stone-800">
        <div>
          <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Message to send</dt>
          <dd className="leading-relaxed text-stone-700">{String(p.message ?? '—')}</dd>
        </div>
        {recipients.length > 0 ? (
          <div>
            <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Recipients</dt>
            <dd>{recipients.join(', ')}</dd>
          </div>
        ) : null}
      </dl>
    );
  }

  if (action.actionType === 'place_outbound_voice_call') {
    return (
      <dl className="grid gap-2 text-xs text-stone-800 sm:grid-cols-2">
        <div>
          <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Phone</dt>
          <dd className="font-mono text-stone-700">{String(p.phone ?? '—')}</dd>
        </div>
        <div>
          <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Member</dt>
          <dd className="font-mono text-[11px] text-stone-700">{String(p.memberId ?? '—')}</dd>
        </div>
      </dl>
    );
  }

  if (action.actionType === 'prepare_shelter_contact') {
    const needs = Array.isArray(p.needs) ? (p.needs as unknown[]).map(String) : [];
    return (
      <dl className="space-y-2 text-xs text-stone-800">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div>
            <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Pet</dt>
            <dd>{String(p.petName ?? '—')}</dd>
          </div>
          <div>
            <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Owner</dt>
            <dd>{String(p.owner ?? '—')}</dd>
          </div>
        </div>
        {needs.length > 0 ? (
          <div>
            <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Needs</dt>
            <dd>{needs.join(', ')}</dd>
          </div>
        ) : null}
      </dl>
    );
  }

  const entries = Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) {
    return <p className="text-xs text-stone-500">No extra parameters for this action.</p>;
  }

  return (
    <dl className="space-y-2 text-xs text-stone-800">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">{humanizeKey(key)}</dt>
          <dd className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-stone-700">
            {formatValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function ApprovalQueue() {
  const { approvals, approveAction, rejectAction, isMonitoring } = useAppStore();

  if (!isMonitoring) {
    return <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 py-6 text-center text-[11px] font-bold uppercase tracking-widest text-stone-400">Agent will propose actions here</div>;
  }

  const visible = approvals.filter(a => ['draft', 'pending', 'approved', 'completed', 'failed'].includes(a.status));

  if (visible.length === 0) {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 py-6 text-center text-[11px] font-bold uppercase tracking-widest text-emerald-700">No pending approvals</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {visible.map(action => {
        const isHighRisk = action.riskLevel === 'high' || action.riskLevel === 'medium';
        const canDecide = action.status === 'pending';
        const cardBgClass = isHighRisk ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200';
        const titleColorClass = isHighRisk ? 'text-orange-700' : 'text-blue-700';
        const badgeClass = isHighRisk ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
        const btnApproveClass = isHighRisk
          ? 'bg-orange-600 hover:bg-orange-500 text-white' 
          : 'bg-stone-950 hover:bg-stone-800 border-stone-950 text-white';

        return (
          <div key={action.id} className={`border rounded-xl p-4 flex flex-col gap-3 ${cardBgClass}`}>
            <div>
              <div className="flex items-start justify-between mb-2">
                <h4 className={`font-bold text-[11px] flex items-center gap-2 uppercase tracking-wide ${titleColorClass}`}>
                  {isHighRisk ? <AlertTriangle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  {action.title}
                </h4>
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${badgeClass}`}>
                  {action.status} · {action.riskLevel}
                </span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed mb-1">
                {action.description}
              </p>
            </div>
            
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">If you approve</div>
              <PlannedActionDetails action={action} />
            </div>
            
            {action.guildTraceId && (
              <div className="text-[10px] text-emerald-700">Audit trace: {action.guildTraceId}</div>
            )}

            {canDecide ? (
              <div className="flex items-center gap-2 mt-1">
                <button 
                  onClick={() => rejectAction(action.id)}
                  className="flex-1 py-2 text-[10px] font-bold tracking-widest text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors uppercase"
                >
                  Reject
                </button>
                <button 
                  onClick={() => approveAction(action.id)}
                  className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-colors uppercase ${btnApproveClass} ${!isHighRisk && 'border'}`}
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500">
                {action.status === 'draft' || action.status === 'failed' ? <ShieldX className="h-3 w-3 text-orange-600" /> : <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                {action.failureReason ?? 'Decision recorded'}
              </div>
            )}
          </div>
        )
      })}
    </div>
  );
}
