import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData, recordMemberCheckIn, startMonitor } from '@/lib/runtime-store';
import { FamilyMemberStatus } from '@/lib/types';

type ToolCallItem = { id: string; name: string; arguments?: Record<string, unknown> };

function isFamilyMemberStatus(value: unknown): value is FamilyMemberStatus {
  return (
    value === 'safe' ||
    value === 'needs_pickup' ||
    value === 'needs_medical_help' ||
    value === 'unreachable' ||
    value === 'unknown'
  );
}

async function executeToolByName(name: string, args: Record<string, unknown>) {
  const normalized = name.replace(/-/g, '_').toLowerCase();
  const dash = getDashboardData();

  switch (normalized) {
    case 'get_household_status':
    case 'safe_signal_get_household_status':
      return { household: dash.household, members: dash.members, incident: dash.incident };
    case 'record_member_checkin':
    case 'safe_signal_record_member_checkin': {
      const memberId = typeof args.memberId === 'string' ? args.memberId : undefined;
      const status = args.status;
      const locationNote = typeof args.locationNote === 'string' ? args.locationNote : undefined;
      if (!memberId || !isFamilyMemberStatus(status)) {
        return { error: 'memberId and a valid status are required' };
      }
      recordMemberCheckIn(memberId, status, locationNote);
      return { ok: true, memberId, status };
    }
    case 'get_current_plan':
    case 'safe_signal_get_current_plan':
      return {
        nextActions: dash.nextActions,
        resources: dash.resources,
        sources: dash.sources,
      };
    case 'request_agent_refresh':
    case 'safe_signal_request_agent_refresh': {
      const next = startMonitor();
      return {
        ok: true,
        incidentId: next.incident?.id,
        lastRefreshedAt: next.incident?.lastRefreshedAt,
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    message?: { type?: string; toolCallList?: ToolCallItem[] };
    tool?: string;
    memberId?: string;
    status?: FamilyMemberStatus;
    locationNote?: string;
  };

  if (body.message?.type === 'tool-calls' && Array.isArray(body.message.toolCallList)) {
    const results: { toolCallId: string; result: string }[] = [];
    for (const tc of body.message.toolCallList) {
      const args = tc.arguments ?? {};
      const output = await executeToolByName(tc.name, args);
      const asString = typeof output === 'string' ? output : JSON.stringify(output);
      results.push({ toolCallId: tc.id, result: asString });
    }
    return NextResponse.json({ results });
  }

  switch (body.tool) {
    case 'get_household_status':
      return NextResponse.json({
        household: getDashboardData().household,
        members: getDashboardData().members,
        incident: getDashboardData().incident,
      });
    case 'record_member_checkin':
      if (!body.memberId || !body.status) {
        return NextResponse.json({ error: 'memberId and status are required' }, { status: 400 });
      }
      return NextResponse.json(recordMemberCheckIn(body.memberId, body.status, body.locationNote));
    case 'get_current_plan':
      return NextResponse.json({
        nextActions: getDashboardData().nextActions,
        resources: getDashboardData().resources,
        sources: getDashboardData().sources,
      });
    case 'request_agent_refresh':
      return NextResponse.json(startMonitor());
    default:
      return NextResponse.json({ error: 'Unknown Vapi tool' }, { status: 400 });
  }
}
