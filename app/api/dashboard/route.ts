import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/runtime-store';
import { loadInsForgeDashboard } from '@/lib/services/insforge-repository';

/** Avoid hanging the UI when InsForge or the network is slow; demo data still loads. */
const LIVE_LOAD_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('dashboard live load timeout')), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}

export async function GET() {
  try {
    const liveData = await withTimeout(loadInsForgeDashboard(), LIVE_LOAD_TIMEOUT_MS);
    if (liveData) {
      return NextResponse.json(liveData);
    }
  } catch {
    // Fall through to demo/runtime data. The UI makes demo fallback visible.
  }
  return NextResponse.json(getDashboardData());
}
