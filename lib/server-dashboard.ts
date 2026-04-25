import { getDashboardData, replaceRuntimeDashboard } from '@/lib/runtime-store';
import { loadInsForgeDashboard } from '@/lib/services/insforge-repository';
import { isLiveInsForgePersistence } from '@/lib/services/insforge-persist';
import type { DashboardData } from '@/lib/types';

/**
 * Authoritative dashboard for server routes: InsForge when live persistence is on,
 * otherwise the in-memory runtime store (demo).
 */
export async function getServerDashboardSnapshot(): Promise<DashboardData> {
  if (isLiveInsForgePersistence()) {
    const live = await loadInsForgeDashboard();
    if (live?.household) return live;
  }
  return getDashboardData();
}

/** Hydrates the runtime store from InsForge so mutations (check-in, monitor) apply to the same graph the UI sees. */
export async function syncRuntimeStoreFromPrimary(): Promise<void> {
  if (!isLiveInsForgePersistence()) return;
  const live = await loadInsForgeDashboard();
  if (live?.household) {
    replaceRuntimeDashboard(live);
  }
}
