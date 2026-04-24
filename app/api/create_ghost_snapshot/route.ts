import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/runtime-store';
import { createGhostSnapshotRecord } from '@/lib/services/ghost';

export async function POST() {
  const incidentId = getDashboardData().incident?.id ?? 'no_incident';
  return NextResponse.json(createGhostSnapshotRecord(incidentId));
}
