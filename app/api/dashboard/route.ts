import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/runtime-store';
import { loadInsForgeDashboard } from '@/lib/services/insforge-repository';

export async function GET() {
  try {
    const liveData = await loadInsForgeDashboard();
    if (liveData) {
      return NextResponse.json(liveData);
    }
  } catch {
    // Fall through to demo/runtime data. The UI makes demo fallback visible.
  }
  return NextResponse.json(getDashboardData());
}
