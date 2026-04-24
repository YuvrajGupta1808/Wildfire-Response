import { NextRequest, NextResponse } from 'next/server';
import { saveHousehold } from '@/lib/runtime-store';
import { persistDashboardToInsForge } from '@/lib/services/insforge-persist';
import { HouseholdInput } from '@/lib/types';

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as HouseholdInput;
  const data = saveHousehold(payload);
  await persistDashboardToInsForge(data);
  return NextResponse.json(data);
}
