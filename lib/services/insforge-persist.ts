import { insforge, isInsForgeConfigured } from '@/lib/insforge';
import type {
  AgentRun,
  ApprovalRequest,
  AuditEvent,
  DashboardData,
  EmergencyResource,
  EvidenceItem,
  FamilyMember,
  Household,
  Incident,
  SourceRecord,
  VoiceCall,
} from '@/lib/types';

/** Mirror `loadInsForgeDashboard`: only persist when backend is configured and demo mode is off. */
export function isLiveInsForgePersistence(): boolean {
  return isInsForgeConfigured && process.env.NEXT_PUBLIC_DEMO_MODE === 'false';
}

function householdRow(h: Household) {
  return {
    id: h.id,
    owner_id: h.ownerId,
    name: h.name,
    home_address: h.homeAddress,
    region: h.region,
    emergency_preferences: h.emergencyPreferences,
    emergency_contacts: h.emergencyContacts,
    outbound_voice_consent: h.outboundVoiceConsent,
    created_at: h.createdAt,
    updated_at: h.updatedAt,
  };
}

function memberRow(m: FamilyMember) {
  return {
    id: m.id,
    household_id: m.householdId,
    name: m.name,
    role: m.role,
    status: m.status,
    location: m.location,
    location_note: m.locationNote,
    needs: m.needs,
    contact_method: m.contactMethod,
    phone: m.phone ?? null,
    pets: m.pets ?? null,
    vehicles: m.vehicles ?? null,
    medical_dependencies: m.medicalDependencies ?? null,
    battery_level: m.batteryLevel ?? null,
    last_check_in: m.lastCheckIn ?? null,
    voice_consent: m.voiceConsent,
    updated_by: m.updatedBy,
  };
}

function incidentRow(i: Incident) {
  return {
    id: i.id,
    household_id: i.householdId,
    name: i.name,
    external_id: i.externalId ?? null,
    location: i.location,
    status: i.status,
    evacuation_status: i.evacuationStatus,
    latitude: i.latitude,
    longitude: i.longitude,
    perimeter: i.perimeter ?? null,
    monitored_sources: i.monitoredSources,
    last_refreshed_at: i.lastRefreshedAt,
    ghost_snapshot_id: i.ghostSnapshotId ?? null,
  };
}

function sourceRow(s: SourceRecord) {
  return {
    id: s.id,
    household_id: s.householdId,
    incident_id: s.incidentId,
    url: s.url,
    title: s.title,
    source_type: s.sourceType,
    trust_score: s.trustScore,
    fetched_at: s.fetchedAt,
    extracted_summary: s.extractedSummary,
  };
}

function resourceRow(r: EmergencyResource) {
  return {
    id: r.id,
    household_id: r.householdId,
    incident_id: r.incidentId,
    type: r.type,
    name: r.name,
    address: r.address,
    distance: r.distance,
    status: r.status,
    capacity: r.capacity ?? null,
    accepts_pets: r.acceptsPets ?? null,
    accessibility: r.accessibility ?? null,
    phone: r.phone ?? null,
    url: r.url ?? null,
    source_id: r.sourceId ?? null,
    confidence: r.confidence,
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

function agentRunRow(r: AgentRun) {
  return {
    id: r.id,
    household_id: r.householdId,
    incident_id: r.incidentId ?? null,
    task: r.task,
    status: r.status,
    sponsor_tool: r.sponsorTool,
    started_at: r.startedAt,
    ended_at: r.endedAt ?? null,
    result_summary: r.resultSummary ?? null,
    error: r.error ?? null,
  };
}

function approvalRow(a: ApprovalRequest) {
  return {
    id: a.id,
    household_id: a.householdId,
    incident_id: a.incidentId,
    action_type: a.actionType,
    title: a.title,
    description: a.description,
    risk_level: a.riskLevel,
    prepared_payload: a.preparedPayload,
    status: a.status,
    prepared_at: a.preparedAt,
    decided_at: a.decidedAt ?? null,
    executed_at: a.executedAt ?? null,
    failure_reason: a.failureReason ?? null,
    guild_trace_id: a.guildTraceId ?? null,
  };
}

function voiceCallRow(v: VoiceCall) {
  return {
    id: v.id,
    household_id: v.householdId,
    incident_id: v.incidentId ?? null,
    vapi_call_id: v.vapiCallId ?? null,
    direction: v.direction,
    member_id: v.memberId ?? null,
    member_name: v.memberName ?? null,
    status: v.status,
    transcript: v.transcript,
    extracted_status: v.extractedStatus ?? null,
    duration_seconds: v.durationSeconds ?? null,
    outcome: v.outcome,
    started_at: v.startedAt,
    ended_at: v.endedAt ?? null,
  };
}

function evidenceRow(e: EvidenceItem) {
  return {
    id: e.id,
    household_id: e.householdId,
    incident_id: e.incidentId ?? null,
    approval_request_id: e.approvalRequestId ?? null,
    voice_call_id: e.voiceCallId ?? null,
    timestamp: e.timestamp,
    kind: e.kind,
    source_url: e.sourceUrl ?? null,
    storage_path: e.storagePath ?? null,
    extracted_data: e.extractedData,
    trust_level: e.trustLevel,
    guild_trace_id: e.guildTraceId ?? null,
  };
}

function auditRow(a: AuditEvent) {
  return {
    id: a.id,
    household_id: a.householdId,
    incident_id: a.incidentId ?? null,
    guild_run_id: a.guildRunId,
    actor: a.actor,
    permission_scope: a.permissionScope,
    tool_call: a.toolCall,
    decision: a.decision,
    outcome: a.outcome,
    created_at: a.createdAt,
  };
}

const upsertOpts = { onConflict: 'id', defaultToNull: false } as const;

async function upsertAll<T extends Record<string, unknown>>(table: string, rows: T[]) {
  if (!insforge || rows.length === 0) return;
  const { error } = await insforge.database.from(table).upsert(rows, upsertOpts);
  if (error) throw error;
}

/**
 * Writes the current dashboard graph for `data.household` to InsForge (upsert by primary key).
 * Safe to no-op when not in live persistence mode or when there is no household.
 */
export async function persistDashboardToInsForge(data: DashboardData): Promise<{ ok: boolean; error?: string }> {
  if (!isLiveInsForgePersistence() || !insforge || !data.household) {
    return { ok: true };
  }

  try {
    const hid = data.household.id;
    await upsertAll('households', [householdRow(data.household)]);
    await upsertAll(
      'members',
      data.members.filter((m) => m.householdId === hid).map(memberRow),
    );
    if (data.incident) {
      await upsertAll('incidents', [incidentRow(data.incident)]);
    }
    await upsertAll(
      'sources',
      data.sources.filter((s) => s.householdId === hid).map(sourceRow),
    );
    await upsertAll(
      'resources',
      data.resources.filter((r) => r.householdId === hid).map(resourceRow),
    );
    await upsertAll(
      'agent_runs',
      data.agentRuns.filter((r) => r.householdId === hid).map(agentRunRow),
    );
    await upsertAll(
      'approval_requests',
      data.approvals.filter((a) => a.householdId === hid).map(approvalRow),
    );
    await upsertAll(
      'voice_calls',
      data.voiceCalls.filter((v) => v.householdId === hid).map(voiceCallRow),
    );
    await upsertAll(
      'evidence_items',
      data.evidence.filter((e) => e.householdId === hid).map(evidenceRow),
    );
    await upsertAll(
      'audit_events',
      data.auditEvents.filter((a) => a.householdId === hid).map(auditRow),
    );
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
