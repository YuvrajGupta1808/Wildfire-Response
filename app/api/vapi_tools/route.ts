import { NextRequest, NextResponse } from 'next/server';
import { recordMemberCheckIn } from '@/lib/runtime-store';
import { getServerDashboardSnapshot, syncRuntimeStoreFromPrimary } from '@/lib/server-dashboard';
import { persistDashboardToInsForge } from '@/lib/services/insforge-persist';
import { runWildfireMonitorWithTinyFish } from '@/lib/services/wildfire-monitor';
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

  switch (normalized) {
    case 'get_household_status':
    case 'safe_signal_get_household_status': {
      const dash = await getServerDashboardSnapshot();
      return { household: dash.household, members: dash.members, incident: dash.incident };
    }
    case 'record_member_checkin':
    case 'safe_signal_record_member_checkin': {
      const memberId = typeof args.memberId === 'string' ? args.memberId : undefined;
      const status = args.status;
      const locationNote = typeof args.locationNote === 'string' ? args.locationNote : undefined;
      if (!memberId || !isFamilyMemberStatus(status)) {
        return { error: 'memberId and a valid status are required' };
      }
      await syncRuntimeStoreFromPrimary();
      const data = recordMemberCheckIn(memberId, status, locationNote, 'vapi');
      await persistDashboardToInsForge(data);
      return { ok: true, memberId, status };
    }
    case 'get_current_plan':
    case 'safe_signal_get_current_plan': {
      const dash = await getServerDashboardSnapshot();
      return {
        nextActions: dash.nextActions,
        resources: dash.resources,
        sources: dash.sources,
      };
    }
    case 'request_agent_refresh':
    case 'safe_signal_request_agent_refresh': {
      const next = await runWildfireMonitorWithTinyFish();
      await persistDashboardToInsForge(next);
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
    case 'get_household_status': {
      const dash = await getServerDashboardSnapshot();
      return NextResponse.json({
        household: dash.household,
        members: dash.members,
        incident: dash.incident,
      });
    }
    case 'record_member_checkin':
      if (!body.memberId || !body.status) {
        return NextResponse.json({ error: 'memberId and status are required' }, { status: 400 });
      }
      await syncRuntimeStoreFromPrimary();
      const data = recordMemberCheckIn(body.memberId, body.status, body.locationNote, 'vapi');
      await persistDashboardToInsForge(data);
      return NextResponse.json(data);
    case 'get_current_plan': {
      const dash = await getServerDashboardSnapshot();
      return NextResponse.json({
        nextActions: dash.nextActions,
        resources: dash.resources,
        sources: dash.sources,
      });
    }
    case 'request_agent_refresh': {
      const next = await runWildfireMonitorWithTinyFish();
      await persistDashboardToInsForge(next);
      return NextResponse.json(next);
    }
    default:
      return NextResponse.json({ error: 'Unknown Vapi tool' }, { status: 400 });
  }
}
