import { insforge, isInsForgeConfigured } from '@/lib/insforge';
import { createDemoDashboardData } from '@/lib/demo-data';
import { DashboardData } from '@/lib/types';

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function snakeToCamelRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  );
}

async function selectTable(table: string) {
  if (!insforge) return [];
  const { data, error } = await insforge.database.from(table).select('*');
  if (error) {
    throw error;
  }
  return asArray<Record<string, unknown>>(data).map(snakeToCamelRecord);
}

export async function loadInsForgeDashboard(): Promise<DashboardData | null> {
  if (!isInsForgeConfigured || !insforge || process.env.NEXT_PUBLIC_DEMO_MODE !== 'false') {
    return null;
  }

  const [
    households,
    members,
    incidents,
    sources,
    resources,
    agentRuns,
    approvals,
    voiceCalls,
    evidence,
    auditEvents,
  ] = await Promise.all([
    selectTable('households'),
    selectTable('members'),
    selectTable('incidents'),
    selectTable('sources'),
    selectTable('resources'),
    selectTable('agent_runs'),
    selectTable('approval_requests'),
    selectTable('voice_calls'),
    selectTable('evidence_items'),
    selectTable('audit_events'),
  ]);

  if (households.length === 0) {
    return null;
  }

  const fallback = createDemoDashboardData();
  return {
    mode: 'live',
    household: households[0] as DashboardData['household'],
    members: members as DashboardData['members'],
    incident: (incidents[0] as DashboardData['incident']) ?? null,
    sources: sources as DashboardData['sources'],
    resources: resources as DashboardData['resources'],
    approvals: approvals as DashboardData['approvals'],
    timeline: fallback.timeline,
    evidence: evidence as DashboardData['evidence'],
    auditEvents: auditEvents as DashboardData['auditEvents'],
    voiceCalls: voiceCalls as DashboardData['voiceCalls'],
    agentRuns: agentRuns as DashboardData['agentRuns'],
    nextActions: fallback.nextActions,
  };
}
