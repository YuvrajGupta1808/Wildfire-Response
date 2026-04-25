import { getDashboardData, startMonitor } from '@/lib/runtime-store';
import { syncRuntimeStoreFromPrimary } from '@/lib/server-dashboard';
import {
  buildWildfireSearchQuery,
  isTinyFishConfigured,
  loadTinyFishMonitorPayload,
} from '@/lib/services/tinyfish';

/**
 * Runs a wildfire monitor tick: optional TinyFish Search + Fetch (same contract as MCP),
 * then updates in-memory dashboard state via `startMonitor`.
 */
export async function runWildfireMonitorWithTinyFish() {
  await syncRuntimeStoreFromPrimary();
  const dash = getDashboardData();
  const query = buildWildfireSearchQuery(dash.household);
  let payload: Awaited<ReturnType<typeof loadTinyFishMonitorPayload>> | null = null;
  if (isTinyFishConfigured()) {
    try {
      payload = await loadTinyFishMonitorPayload(query);
    } catch {
      payload = null;
    }
  }
  return startMonitor(payload);
}
