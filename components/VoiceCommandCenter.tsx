'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, PhoneCall, PhoneOff, PhoneOutgoing, Radio } from 'lucide-react';
import { useAppStore } from '@/lib/store';

/** Ref only needs `stop`; full client comes from `@vapi-ai/web`. */
type VapiStopCapable = { stop(): Promise<void> };

type VapiConfig = {
  publicKey: string;
  assistantId: string;
  configured: boolean;
  toolServerUrl?: string;
  webhookUrl?: string;
};

export default function VoiceCommandCenter() {
  const { voiceCalls, members, approvals } = useAppStore();
  const [config, setConfig] = useState<VapiConfig | null>(null);
  const [voiceState, setVoiceState] = useState<'idle' | 'starting' | 'active' | 'unconfigured'>('idle');
  const vapiRef = useRef<VapiStopCapable | null>(null);

  useEffect(() => {
    fetch('/api/vapi_config')
      .then((response) => response.json())
      .then((payload: VapiConfig) => {
        setConfig(payload);
        if (!payload.configured) setVoiceState('unconfigured');
      })
      .catch(() => setVoiceState('unconfigured'));
  }, []);

  useEffect(() => {
    return () => {
      const v = vapiRef.current;
      vapiRef.current = null;
      void v?.stop();
    };
  }, []);

  const unresolved = useMemo(
    () => members.filter((member) => member.status === 'unknown' || member.status === 'unreachable'),
    [members],
  );

  const outboundPending = approvals.filter((approval) => approval.actionType === 'place_outbound_voice_call' && approval.status === 'pending');

  const startWebVoice = async () => {
    if (!config?.configured) {
      setVoiceState('unconfigured');
      return;
    }
    setVoiceState('starting');
    try {
      const Vapi = (await import('@vapi-ai/web')).default;
      const client = new Vapi(config.publicKey);
      vapiRef.current = client;
      client.on('call-start', () => setVoiceState('active'));
      client.on('call-end', () => {
        vapiRef.current = null;
        setVoiceState('idle');
      });
      client.on('error', () => {
        vapiRef.current = null;
        setVoiceState('idle');
      });
      await client.start(config.assistantId);
    } catch {
      vapiRef.current = null;
      setVoiceState('idle');
    }
  };

  const endWebVoice = async () => {
    try {
      await vapiRef.current?.stop();
    } catch {
      /* ignore */
    } finally {
      vapiRef.current = null;
      setVoiceState('idle');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-500">
            <Radio className="h-3 w-3" /> State
          </div>
          <div className="text-sm font-semibold text-stone-950">{voiceState.replace('_', ' ')}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-500">
            <PhoneOutgoing className="h-3 w-3" /> Pending
          </div>
          <div className="text-sm font-semibold text-stone-950">{outboundPending.length}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-500">
            <PhoneCall className="h-3 w-3" /> Calls
          </div>
          <div className="text-sm font-semibold text-stone-950">{voiceCalls.length}</div>
        </div>
      </div>

      {voiceState === 'active' ? (
        <button
          type="button"
          onClick={() => void endWebVoice()}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-red-800 transition-colors hover:bg-red-100"
        >
          <PhoneOff className="h-4 w-4" />
          End call
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void startWebVoice()}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={voiceState === 'starting' || voiceState === 'unconfigured'}
        >
          <Mic className="h-4 w-4" />
          {voiceState === 'unconfigured' ? 'Vapi not configured' : voiceState === 'starting' ? 'Connecting…' : 'Start web voice'}
        </button>
      )}

      {config?.toolServerUrl && config.webhookUrl ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-700">
          <div className="font-bold uppercase tracking-widest text-stone-500">Vapi dashboard wiring</div>
          <p className="mt-2">
            Custom tool server URL: <span className="font-mono text-[10px] text-stone-900">{config.toolServerUrl}</span>
            <br />
            Server / webhook URL: <span className="font-mono text-[10px] text-stone-900">{config.webhookUrl}</span>
            <br />
            Set <code className="rounded bg-white px-1">APP_URL</code> to your public origin so Vapi can reach this app.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs leading-relaxed text-orange-950">
        Voice guidance is source-backed only. For immediate danger, call 911 or your local emergency line.
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Unresolved check-ins</div>
        {unresolved.length === 0 ? (
          <div className="text-xs text-emerald-700">No unresolved members</div>
        ) : (
          unresolved.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
              <span className="text-stone-800">{member.name}</span>
              <span className="uppercase tracking-wider text-orange-700">{member.status.replaceAll('_', ' ')}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Recent transcripts</div>
        {voiceCalls.slice(-3).map((call) => (
          <div key={call.id} className="rounded-xl border border-stone-200 bg-stone-50 p-2 text-xs text-stone-700">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-stone-500">
              <span>{call.direction}</span>
              <span>{call.status}</span>
            </div>
            {call.transcript || call.outcome}
          </div>
        ))}
      </div>
    </div>
  );
}
