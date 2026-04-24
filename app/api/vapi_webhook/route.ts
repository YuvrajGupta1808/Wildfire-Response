import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData, ingestVapiWebhook } from '@/lib/runtime-store';
import { persistDashboardToInsForge } from '@/lib/services/insforge-persist';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const updated = ingestVapiWebhook(body);
  if (updated) {
    await persistDashboardToInsForge(updated);
  }
  return NextResponse.json({
    ok: true,
    received: (body as { type?: string })?.type ?? (body as { message?: { type?: string } }).message?.type ?? 'vapi_webhook',
    householdId: getDashboardData().household?.id,
    synced: Boolean(updated),
  });
}
