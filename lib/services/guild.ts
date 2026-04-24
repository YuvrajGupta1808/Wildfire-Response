import { AuditEvent } from '@/lib/types';

export function createGuildTraceId(prefix = 'guild_trace') {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function buildAuditEvent(
  input: Omit<AuditEvent, 'id' | 'createdAt' | 'guildRunId'> & { guildRunId?: string },
): AuditEvent {
  return {
    id: `audit_${crypto.randomUUID()}`,
    guildRunId: input.guildRunId ?? createGuildTraceId('guild_run'),
    createdAt: new Date().toISOString(),
    ...input,
  };
}
