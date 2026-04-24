export type GhostSnapshot = {
  id: string;
  databaseId?: string;
  forkId?: string;
  status: 'recorded' | 'not_configured';
  summary: string;
};

export function createGhostSnapshotRecord(incidentId: string): GhostSnapshot {
  return {
    id: `ghost_snapshot_${incidentId}_${Date.now()}`,
    databaseId: process.env.GHOST_DATABASE_ID,
    forkId: process.env.GHOST_FORK_ID,
    status: process.env.GHOST_DATABASE_ID || process.env.GHOST_FORK_ID ? 'recorded' : 'not_configured',
    summary:
      process.env.GHOST_DATABASE_ID || process.env.GHOST_FORK_ID
        ? 'Ghost database/fork metadata recorded for safe incident simulation.'
        : 'Ghost credentials are not configured; recorded a local snapshot placeholder.',
  };
}
