import { createClient } from '@insforge/sdk';

const baseUrl =
  process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

export const isInsForgeConfigured = Boolean(baseUrl && anonKey);

function createInsForgeClientSafely() {
  if (!baseUrl || !anonKey) return null;
  try {
    return createClient({ baseUrl, anonKey });
  } catch {
    return null;
  }
}

export const insforge = createInsForgeClientSafely();

export const INSFORGE_TABLES = [
  'households',
  'members',
  'incidents',
  'sources',
  'resources',
  'agent_runs',
  'approval_requests',
  'voice_calls',
  'evidence_items',
  'audit_events',
] as const;
