import { NextResponse } from 'next/server';
import { persistDashboardToInsForge } from '@/lib/services/insforge-persist';
import { runWildfireMonitorWithTinyFish } from '@/lib/services/wildfire-monitor';

export async function POST() {
  const data = await runWildfireMonitorWithTinyFish();
  await persistDashboardToInsForge(data);
  return NextResponse.json(data);
}
