import { NextRequest, NextResponse } from 'next/server';
import { recordMemberCheckIn } from '@/lib/runtime-store';
import { syncRuntimeStoreFromPrimary } from '@/lib/server-dashboard';
import { persistDashboardToInsForge } from '@/lib/services/insforge-persist';
import { FamilyMemberStatus } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    memberId?: string;
    status?: FamilyMemberStatus;
    locationNote?: string;
  };

  if (!body.memberId || !body.status) {
    return NextResponse.json({ error: 'memberId and status are required' }, { status: 400 });
  }

  await syncRuntimeStoreFromPrimary();
  const data = recordMemberCheckIn(body.memberId, body.status, body.locationNote);
  await persistDashboardToInsForge(data);
  return NextResponse.json(data);
}
