import { createDemoDashboardData } from '@/lib/demo-data';
import { clipText, searchHitsToSourceRecords, type TinyFishMonitorPayload } from '@/lib/services/tinyfish';
import {
  AgentRun,
  ApprovalRequest,
  AuditEvent,
  DashboardData,
  EvidenceItem,
  FamilyMember,
  Household,
  HouseholdInput,
  Incident,
  SourceRecord,
  TimelineEvent,
  VoiceCall,
} from '@/lib/types';

const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

let dashboard = createDemoDashboardData();

function pushTimeline(event: Omit<TimelineEvent, 'id' | 'timestamp' | 'householdId' | 'incidentId'>) {
  dashboard.timeline = [
    ...dashboard.timeline,
    {
      id: randomId('tl'),
      timestamp: now(),
      householdId: dashboard.household?.id ?? 'hh_demo_santa_rosa',
      incidentId: dashboard.incident?.id,
      ...event,
    },
  ];
}

function pushAudit(event: Omit<AuditEvent, 'id' | 'createdAt' | 'householdId' | 'incidentId' | 'guildRunId'> & { guildRunId?: string }) {
  dashboard.auditEvents = [
    ...dashboard.auditEvents,
    {
      id: randomId('audit'),
      householdId: dashboard.household?.id ?? 'hh_demo_santa_rosa',
      incidentId: dashboard.incident?.id,
      guildRunId: event.guildRunId ?? randomId('guild_run'),
      createdAt: now(),
      ...event,
    },
  ];
}

function pushEvidence(item: Omit<EvidenceItem, 'id' | 'timestamp' | 'householdId' | 'incidentId'>) {
  dashboard.evidence = [
    ...dashboard.evidence,
    {
      id: randomId('ev'),
      householdId: dashboard.household?.id ?? 'hh_demo_santa_rosa',
      incidentId: dashboard.incident?.id,
      timestamp: now(),
      ...item,
    },
  ];
}

export function getDashboardData(): DashboardData {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
  return { ...dashboard, mode: demoMode ? 'demo' : 'live' };
}

export function saveHousehold(input: HouseholdInput): DashboardData {
  const createdAt = dashboard.household?.createdAt ?? now();
  const household: Household = {
    id: dashboard.household?.id ?? randomId('hh'),
    ownerId: 'current-user',
    name: input.name,
    homeAddress: input.homeAddress,
    region: input.region,
    emergencyPreferences: {
      evacuationMode: 'monitor',
      accessibilityNotes: input.accessibilityNotes,
      supplies: input.supplies,
      vehicles: input.vehicles,
      pets: input.pets,
      medicalDependencies: input.medicalDependencies,
    },
    emergencyContacts: input.members
      .filter((member) => member.phone)
      .map((member, index) => ({
        id: `ec_${index + 1}`,
        name: member.name,
        relationship: member.role,
        phone: member.phone ?? '',
        optInVoice: member.voiceConsent,
      })),
    outboundVoiceConsent: input.outboundVoiceConsent,
    createdAt,
    updatedAt: now(),
  };

  const members: FamilyMember[] = input.members.map((member, index) => ({
    id: dashboard.members[index]?.id ?? randomId('mem'),
    householdId: household.id,
    name: member.name,
    role: member.role,
    status: index === 0 ? 'safe' : 'unknown',
    location: member.location,
    locationNote: '',
    needs: member.needs,
    contactMethod: member.contactMethod,
    phone: member.phone,
    lastCheckIn: index === 0 ? now() : undefined,
    voiceConsent: member.voiceConsent,
    updatedBy: 'user',
  }));

  dashboard = {
    ...dashboard,
    household,
    members,
  };

  pushTimeline({
    source: 'InsForge Profile',
    content: 'Household profile saved for monitored wildfire response.',
    type: 'user',
  });
  pushAudit({
    actor: 'user',
    permissionScope: 'access_sensitive_profile',
    toolCall: 'households.upsert',
    decision: 'allowed',
    outcome: 'Household profile updated.',
  });

  return getDashboardData();
}

export function startMonitor(tinyFish?: TinyFishMonitorPayload | null): DashboardData {
  const householdId = dashboard.household?.id ?? 'hh_demo_santa_rosa';
  const incident: Incident = {
    id: dashboard.incident?.id ?? randomId('inc'),
    householdId,
    name: 'Wildfire near household address',
    location: dashboard.household?.region ?? 'Sonoma County, California',
    status: 'active',
    evacuationStatus: 'warning',
    latitude: dashboard.incident?.latitude ?? 38.48,
    longitude: dashboard.incident?.longitude ?? -122.65,
    monitoredSources: ['CAL FIRE', 'county emergency', 'utility outage', 'road closure source'],
    lastRefreshedAt: now(),
    ghostSnapshotId: dashboard.incident?.ghostSnapshotId ?? randomId('ghost_snapshot'),
  };

  const t = now();
  let nextSources: SourceRecord[];
  if (tinyFish?.searchHits?.length) {
    nextSources = searchHitsToSourceRecords(tinyFish.searchHits, householdId, incident.id, t);
    const labels = Array.from(
      new Set(
        nextSources.map((s) => {
          try {
            return new URL(s.url).hostname;
          } catch {
            return s.title;
          }
        }),
      ),
    ).slice(0, 8);
    incident.monitoredSources = labels;
  } else {
    nextSources = dashboard.sources.map((s) =>
      s.householdId === householdId ? { ...s, incidentId: incident.id } : s,
    );
  }

  const nextResources = dashboard.resources.map((r) =>
    r.householdId === householdId ? { ...r, incidentId: incident.id } : r,
  );

  const fetchEvidence: EvidenceItem[] = (tinyFish?.fetchResults ?? []).map((r) => ({
    id: randomId('ev'),
    householdId,
    incidentId: incident.id,
    timestamp: t,
    kind: 'source_url' as const,
    sourceUrl: r.final_url ?? r.url,
    extractedData: clipText(r.text ?? r.description ?? '', 4000),
    trustLevel: r.title ? `TinyFish fetch: ${r.title}` : 'TinyFish fetch',
    guildTraceId: undefined,
  }));

  const sponsorTool: AgentRun['sponsorTool'] =
    tinyFish?.fetchResults?.length && tinyFish.searchHits?.length
      ? 'TinyFish Search'
      : tinyFish?.searchHits?.length
        ? 'TinyFish Search'
        : 'TinyFish Agent SSE';

  const resultSummary =
    tinyFish?.searchHits?.length || tinyFish?.fetchResults?.length
      ? `TinyFish: ${tinyFish.searchHits.length} search hits, ${tinyFish.fetchResults.length} pages fetched for this monitor run.`
      : 'Live adapter attempted source discovery; demo fallback populated source-backed records.';

  const run: AgentRun = {
    id: randomId('run'),
    householdId,
    incidentId: incident.id,
    task: `Monitor wildfire near ${dashboard.household?.homeAddress ?? 'Santa Rosa, CA'}`,
    status: 'completed',
    sponsorTool,
    startedAt: t,
    endedAt: t,
    resultSummary,
  };

  const nextEvidence = [
    ...dashboard.evidence.map((e) => (e.householdId === householdId ? { ...e, incidentId: incident.id } : e)),
    ...fetchEvidence.map((e) => ({ ...e, guildTraceId: run.id })),
  ];

  dashboard = {
    ...dashboard,
    incident,
    sources: nextSources,
    resources: nextResources,
    evidence: nextEvidence,
    agentRuns: [...dashboard.agentRuns, run],
  };

  pushTimeline({
    source: 'TinyFish',
    content: tinyFish?.searchHits?.length
      ? `Search returned ${tinyFish.searchHits.length} URLs; ${tinyFish.fetchResults.length} pages fetched for summaries.`
      : 'Monitor run completed and refreshed official/local source records.',
    type: 'agent',
  });
  pushTimeline({
    source: 'Ghost Snapshot',
    content: 'Incident snapshot recorded for safe what-if queries without mutating production state.',
    type: 'system',
  });
  pushEvidence({
    kind: 'audit_trace',
    extractedData: 'Monitor run wrote source, resource, approval, and evidence records.',
    trustLevel: 'System audit',
    guildTraceId: run.id,
  });
  pushAudit({
    guildRunId: run.id,
    actor: 'wildfire_family_response_agent',
    permissionScope: 'read_web_sources',
    toolCall:
      tinyFish?.fetchResults?.length && tinyFish.searchHits?.length
        ? 'tinyfish.search+tinyfish.fetch'
        : tinyFish?.searchHits?.length
          ? 'tinyfish.search'
          : 'tinyfish.agent.run-sse',
    decision: 'allowed',
    outcome: 'Official/local wildfire monitor workflow completed.',
  });

  return getDashboardData();
}

export function findApproval(id: string): ApprovalRequest | undefined {
  return dashboard.approvals.find((approval) => approval.id === id);
}

export type ApproveOutboundVoiceOptions =
  | { source: 'demo' }
  | { source: 'vapi'; vapiCallId: string };

export function approveAction(id: string, outboundVoice?: ApproveOutboundVoiceOptions): DashboardData {
  const target = dashboard.approvals.find((approval) => approval.id === id);
  if (!target || target.status !== 'pending') {
    return getDashboardData();
  }

  const isAllowedExecution =
    target.actionType === 'send_family_alert' || target.actionType === 'place_outbound_voice_call';
  const guildTraceId = randomId('guild_trace');

  const updated: ApprovalRequest = {
    ...target,
    status: isAllowedExecution ? 'completed' : 'approved',
    decidedAt: now(),
    executedAt: isAllowedExecution ? now() : undefined,
    guildTraceId,
    failureReason: isAllowedExecution ? undefined : 'MVP prepares external form drafts but does not submit them.',
  };

  dashboard.approvals = dashboard.approvals.map((approval) => (approval.id === id ? updated : approval));

  if (target.actionType === 'place_outbound_voice_call') {
    const member = dashboard.members.find((item) => item.id === target.preparedPayload.memberId);
    const useLiveVapi = outboundVoice?.source === 'vapi' && outboundVoice.vapiCallId;

    if (useLiveVapi) {
      const voiceCall: VoiceCall = {
        id: randomId('vc'),
        vapiCallId: outboundVoice.vapiCallId,
        householdId: dashboard.household?.id ?? 'hh_demo_santa_rosa',
        incidentId: dashboard.incident?.id,
        direction: 'outbound',
        memberId: member?.id,
        memberName: member?.name,
        status: 'queued',
        transcript: 'Outbound call requested via Vapi; transcript will appear when the call completes.',
        outcome: 'Live outbound call placed; awaiting webhook completion.',
        startedAt: now(),
      };
      dashboard.voiceCalls = [...dashboard.voiceCalls, voiceCall];
      pushEvidence({
        kind: 'call_transcript',
        voiceCallId: voiceCall.id,
        extractedData: `Vapi call ${outboundVoice.vapiCallId} queued for ${member?.name ?? 'member'}.`,
        trustLevel: 'Vapi call transcript',
        guildTraceId,
      });
    } else {
      const voiceCall: VoiceCall = {
        id: randomId('vc'),
        householdId: dashboard.household?.id ?? 'hh_demo_santa_rosa',
        incidentId: dashboard.incident?.id,
        direction: 'outbound',
        memberId: member?.id,
        memberName: member?.name,
        status: 'completed',
        transcript: 'Automated check-in completed. Member said safe but needs pickup.',
        extractedStatus: 'needs_pickup',
        outcome: 'Member status updated from Vapi check-in result.',
        durationSeconds: 35,
        startedAt: now(),
        endedAt: now(),
      };
      dashboard.voiceCalls = [...dashboard.voiceCalls, voiceCall];
      dashboard.members = dashboard.members.map((item) =>
        item.id === member?.id
          ? { ...item, status: 'needs_pickup', lastCheckIn: now(), updatedBy: 'vapi' }
          : item,
      );
      pushEvidence({
        kind: 'call_transcript',
        voiceCallId: voiceCall.id,
        extractedData: voiceCall.transcript,
        trustLevel: 'Vapi call transcript',
        guildTraceId,
      });
    }
  }

  pushTimeline({
    source: 'Approval Gate',
    content: isAllowedExecution
      ? `Approved and executed limited MVP action: ${target.title}.`
      : `Approved draft only; external form submission remains blocked for MVP: ${target.title}.`,
    type: 'approval',
  });
  pushEvidence({
    kind: 'audit_trace',
    approvalRequestId: id,
    extractedData: `Approval decision recorded for ${target.title}.`,
    trustLevel: 'Guild-style audit',
    guildTraceId,
  });
  pushAudit({
    guildRunId: guildTraceId,
    actor: 'user',
    permissionScope:
      target.actionType === 'place_outbound_voice_call' ? 'place_outbound_voice_call' : 'submit_external_action',
    toolCall: `approval.${target.actionType}`,
    decision: isAllowedExecution ? 'approved' : 'blocked',
    outcome: isAllowedExecution
      ? 'Allowed limited contact action after explicit approval.'
      : 'External form submission blocked; draft retained.',
  });

  return getDashboardData();
}

export function rejectAction(id: string): DashboardData {
  dashboard.approvals = dashboard.approvals.map((approval) =>
    approval.id === id ? { ...approval, status: 'rejected', decidedAt: now() } : approval,
  );
  pushTimeline({
    source: 'Approval Gate',
    content: 'User rejected a prepared action.',
    type: 'approval',
  });
  return getDashboardData();
}

export function recordMemberCheckIn(memberId: string, status: FamilyMember['status'], locationNote?: string): DashboardData {
  dashboard.members = dashboard.members.map((member) =>
    member.id === memberId
      ? {
          ...member,
          status,
          locationNote: locationNote ?? member.locationNote,
          lastCheckIn: now(),
          updatedBy: 'user',
        }
      : member,
  );
  pushTimeline({
    source: 'Family Check-in',
    content: `Member status updated to ${status.replaceAll('_', ' ')}.`,
    type: 'user',
  });
  return getDashboardData();
}

function applyVapiCallStatusFromWebhook(vapiCallId: string, status: VoiceCall['status']): DashboardData {
  const idx = dashboard.voiceCalls.findIndex((c) => c.vapiCallId === vapiCallId);
  if (idx === -1) {
    return getDashboardData();
  }
  dashboard.voiceCalls[idx] = { ...dashboard.voiceCalls[idx], status };
  return getDashboardData();
}

function applyVapiCallCompletionFromWebhook(payload: {
  vapiCallId: string;
  transcript: string;
  endedReason?: string;
  status: VoiceCall['status'];
}): DashboardData {
  const t = now();
  const idx = dashboard.voiceCalls.findIndex((c) => c.vapiCallId === payload.vapiCallId);
  if (idx === -1) {
    const voiceCall: VoiceCall = {
      id: randomId('vc'),
      vapiCallId: payload.vapiCallId,
      householdId: dashboard.household?.id ?? 'hh_demo_santa_rosa',
      incidentId: dashboard.incident?.id,
      direction: 'web',
      status: payload.status,
      transcript: payload.transcript || 'Call completed.',
      outcome: payload.endedReason ? `Call ended: ${payload.endedReason}` : 'Voice session completed.',
      startedAt: t,
      endedAt: t,
    };
    dashboard.voiceCalls = [...dashboard.voiceCalls, voiceCall];
    pushTimeline({
      source: 'Vapi',
      content: 'Voice call completed; transcript synced.',
      type: 'voice',
    });
    return getDashboardData();
  }

  const existing = dashboard.voiceCalls[idx];
  dashboard.voiceCalls[idx] = {
    ...existing,
    transcript: payload.transcript || existing.transcript,
    status: payload.status,
    endedAt: t,
    outcome: payload.endedReason ? `Call ended: ${payload.endedReason}` : existing.outcome,
  };
  pushTimeline({
    source: 'Vapi',
    content: 'Voice call completed; transcript synced.',
    type: 'voice',
  });
  return getDashboardData();
}

/** Apply Vapi server-message webhook payloads (e.g. status-update, end-of-call-report). */
export function ingestVapiWebhook(body: unknown): DashboardData | null {
  const root = body as {
    message?: {
      type?: string;
      call?: { id?: string; status?: string };
      status?: string;
      artifact?: { transcript?: string };
      endedReason?: string;
    };
  };
  const msg = root.message;
  if (!msg?.type) {
    return null;
  }
  const vapiCallId = msg.call?.id;
  if (!vapiCallId) {
    return null;
  }

  if (msg.type === 'status-update') {
    const raw = (msg.status ?? msg.call?.status ?? '').toLowerCase().replace(/-/g, '_');
    if (raw === 'in_progress' || raw === 'inprogress') {
      return applyVapiCallStatusFromWebhook(vapiCallId, 'in_progress');
    }
    if (raw === 'ringing' || raw === 'queued') {
      return applyVapiCallStatusFromWebhook(vapiCallId, raw === 'ringing' ? 'ringing' : 'queued');
    }
    return null;
  }

  if (msg.type === 'end-of-call-report') {
    const transcript = typeof msg.artifact?.transcript === 'string' ? msg.artifact.transcript : '';
    const ended = msg.endedReason ?? msg.call?.status;
    const endedStr = typeof ended === 'string' ? ended.toLowerCase() : '';
    const failed = endedStr.includes('error') || endedStr.includes('failed');
    return applyVapiCallCompletionFromWebhook({
      vapiCallId,
      transcript,
      endedReason: typeof ended === 'string' ? ended : undefined,
      status: failed ? 'failed' : 'completed',
    });
  }

  return null;
}
