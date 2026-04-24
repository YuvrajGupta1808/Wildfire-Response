export type TrustLevel = 'official' | 'utility' | 'verified_nonprofit' | 'general_web' | 'system';

export type FamilyMemberStatus =
  | 'safe'
  | 'needs_pickup'
  | 'needs_medical_help'
  | 'unreachable'
  | 'unknown';

export type Household = {
  id: string;
  ownerId: string;
  name: string;
  homeAddress: string;
  region: string;
  emergencyPreferences: {
    evacuationMode: 'leave_now' | 'prepare' | 'monitor';
    accessibilityNotes: string;
    supplies: string[];
    vehicles: string[];
    pets: string[];
    medicalDependencies: string[];
  };
  emergencyContacts: EmergencyContact[];
  outboundVoiceConsent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  optInVoice: boolean;
};

export type FamilyMember = {
  id: string;
  householdId: string;
  name: string;
  role: string;
  status: FamilyMemberStatus;
  location: string;
  locationNote: string;
  needs: string[];
  contactMethod: string;
  phone?: string;
  pets?: string[];
  vehicles?: string[];
  medicalDependencies?: string[];
  batteryLevel?: number;
  lastCheckIn?: string;
  voiceConsent: boolean;
  updatedBy: 'user' | 'vapi' | 'agent' | 'demo';
};

export type Incident = {
  id: string;
  householdId: string;
  name: string;
  externalId?: string;
  location: string;
  status: 'monitoring' | 'active' | 'contained' | 'resolved' | 'unknown';
  evacuationStatus: 'order' | 'warning' | 'none' | 'unknown';
  latitude: number;
  longitude: number;
  perimeter?: [number, number][];
  monitoredSources: string[];
  lastRefreshedAt: string;
  ghostSnapshotId?: string;
};

export type SourceRecord = {
  id: string;
  householdId: string;
  incidentId: string;
  url: string;
  title: string;
  sourceType: TrustLevel;
  trustScore: number;
  fetchedAt: string;
  extractedSummary: string;
};

export type EmergencyResource = {
  id: string;
  householdId: string;
  incidentId: string;
  type:
    | 'shelter'
    | 'cooling_center'
    | 'animal_shelter'
    | 'charging'
    | 'aid'
    | 'road_closure'
    | 'outage'
    | 'clinic';
  name: string;
  address: string;
  distance: string;
  status: 'open' | 'full' | 'closed' | 'unknown';
  capacity?: string;
  acceptsPets?: boolean;
  accessibility?: string[];
  phone?: string;
  url?: string;
  sourceId?: string;
  confidence: number;
  latitude: number;
  longitude: number;
};

export type ActionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';

export type ApprovalRequest = {
  id: string;
  householdId: string;
  incidentId: string;
  actionType:
    | 'send_family_alert'
    | 'place_outbound_voice_call'
    | 'prepare_shelter_contact'
    | 'request_agent_refresh'
    | 'manual_review';
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  preparedPayload: Record<string, unknown>;
  status: ActionStatus;
  preparedAt: string;
  decidedAt?: string;
  executedAt?: string;
  failureReason?: string;
  guildTraceId?: string;
};

export type TimelineEvent = {
  id: string;
  householdId: string;
  incidentId?: string;
  timestamp: string;
  source: string;
  content: string;
  type: 'alert' | 'agent' | 'user' | 'system' | 'voice' | 'approval';
  sourceUrl?: string;
  evidenceId?: string;
};

export type VoiceCall = {
  id: string;
  householdId: string;
  incidentId?: string;
  vapiCallId?: string;
  direction: 'inbound' | 'outbound' | 'web';
  memberId?: string;
  memberName?: string;
  status: 'queued' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'needs_review';
  transcript: string;
  extractedStatus?: FamilyMemberStatus;
  durationSeconds?: number;
  outcome: string;
  startedAt: string;
  endedAt?: string;
};

export type EvidenceItem = {
  id: string;
  householdId: string;
  incidentId?: string;
  approvalRequestId?: string;
  voiceCallId?: string;
  timestamp: string;
  kind: 'source_url' | 'screenshot' | 'file' | 'call_transcript' | 'audit_trace' | 'submission_receipt';
  sourceUrl?: string;
  storagePath?: string;
  extractedData: string;
  trustLevel: string;
  guildTraceId?: string;
};

export type AuditEvent = {
  id: string;
  householdId: string;
  incidentId?: string;
  guildRunId: string;
  actor: 'wildfire_family_response_agent' | 'user' | 'vapi' | 'system';
  permissionScope:
    | 'read_web_sources'
    | 'analyze_incident'
    | 'prepare_action'
    | 'submit_external_action'
    | 'place_outbound_voice_call'
    | 'record_voice_checkin'
    | 'access_sensitive_profile'
    | 'write_audit_log';
  toolCall: string;
  decision: 'allowed' | 'blocked' | 'requires_approval' | 'approved' | 'rejected';
  outcome: string;
  createdAt: string;
};

export type AgentRun = {
  id: string;
  householdId: string;
  incidentId?: string;
  task: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  sponsorTool: 'TinyFish Search' | 'TinyFish Fetch' | 'TinyFish Agent SSE' | 'Ghost' | 'Guild.ai' | 'InsForge';
  startedAt: string;
  endedAt?: string;
  resultSummary?: string;
  error?: string;
};

export type DashboardData = {
  mode: 'live' | 'demo';
  household: Household | null;
  members: FamilyMember[];
  incident: Incident | null;
  sources: SourceRecord[];
  resources: EmergencyResource[];
  approvals: ApprovalRequest[];
  timeline: TimelineEvent[];
  evidence: EvidenceItem[];
  auditEvents: AuditEvent[];
  voiceCalls: VoiceCall[];
  agentRuns: AgentRun[];
  nextActions: string[];
};

export type HouseholdInput = {
  name: string;
  homeAddress: string;
  region: string;
  supplies: string[];
  pets: string[];
  vehicles: string[];
  medicalDependencies: string[];
  accessibilityNotes: string;
  outboundVoiceConsent: boolean;
  members: Array<{
    name: string;
    role: string;
    location: string;
    needs: string[];
    contactMethod: string;
    phone?: string;
    voiceConsent: boolean;
  }>;
};
