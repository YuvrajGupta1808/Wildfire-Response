'use client';

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createDemoDashboardData } from '@/lib/demo-data';
import { DashboardData, FamilyMemberStatus, HouseholdInput } from '@/lib/types';

interface AppState extends DashboardData {
  loading: boolean;
  error: string | null;
  isMonitoring: boolean;
  reload: () => Promise<void>;
  saveHousehold: (input: HouseholdInput) => Promise<void>;
  startMonitoring: () => Promise<void>;
  refreshIncident: () => Promise<void>;
  approveAction: (id: string) => Promise<void>;
  rejectAction: (id: string) => Promise<void>;
  recordMemberCheckIn: (memberId: string, status: FamilyMemberStatus, locationNote?: string) => Promise<void>;
}

const emptyDashboard: DashboardData = {
  mode: 'demo',
  household: null,
  members: [],
  incident: null,
  sources: [],
  resources: [],
  approvals: [],
  timeline: [],
  evidence: [],
  auditEvents: [],
  voiceCalls: [],
  agentRuns: [],
  nextActions: [],
};

const AppContext = createContext<AppState | undefined>(undefined);

/** Avoid putting full HTML error pages (or huge bodies) into UI `error` state. */
function summarizeFailedResponseBody(status: number, text: string): string {
  const trimmed = text.trim();
  const sniff = trimmed.slice(0, 80).toLowerCase().replace(/^\uFEFF/, '');
  if (sniff.startsWith('<!doctype') || sniff.startsWith('<html')) {
    return `HTTP ${status}: the server returned an HTML page instead of JSON. Check the API route, deployment, and server logs.`;
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const j = JSON.parse(trimmed) as { error?: string; message?: string };
      const msg = j.error ?? j.message;
      if (typeof msg === 'string' && msg.trim()) {
        return `HTTP ${status}: ${msg.trim()}`;
      }
    } catch {
      /* fall through */
    }
  }
  const oneLine = trimmed.replace(/\s+/g, ' ').trim();
  const max = 320;
  if (!oneLine) return `Request failed (${status})`;
  if (oneLine.length <= max) return `HTTP ${status}: ${oneLine}`;
  return `HTTP ${status}: ${oneLine.slice(0, max)}…`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const raw = await response.text();
    const text = raw.length > 48_000 ? `${raw.slice(0, 48_000)}…` : raw;
    throw new Error(summarizeFailedResponseBody(response.status, text));
  }
  return response.json() as Promise<T>;
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyData = useCallback((next: DashboardData) => {
    setData(next);
    setError(null);
  }, []);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      applyData(await fetchJson<DashboardData>('/api/dashboard'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load dashboard';
      // Keep the UI usable: emptyDashboard leaves lists/maps looking blank with no explanation.
      setData(createDemoDashboardData());
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [reload]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void reload();
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [reload]);

  const saveHousehold = useCallback(
    async (input: HouseholdInput) => {
      applyData(
        await fetchJson<DashboardData>('/api/household', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      );
    },
    [applyData],
  );

  const startMonitoring = useCallback(async () => {
    applyData(await fetchJson<DashboardData>('/api/start_wildfire_monitor', { method: 'POST' }));
  }, [applyData]);

  const refreshIncident = useCallback(async () => {
    applyData(await fetchJson<DashboardData>('/api/refresh_incident', { method: 'POST' }));
  }, [applyData]);

  const approveAction = useCallback(
    async (id: string) => {
      applyData(
        await fetchJson<DashboardData>('/api/approve_action', {
          method: 'POST',
          body: JSON.stringify({ id, decision: 'approve' }),
        }),
      );
    },
    [applyData],
  );

  const rejectAction = useCallback(
    async (id: string) => {
      applyData(
        await fetchJson<DashboardData>('/api/approve_action', {
          method: 'POST',
          body: JSON.stringify({ id, decision: 'reject' }),
        }),
      );
    },
    [applyData],
  );

  const recordMemberCheckIn = useCallback(
    async (memberId: string, status: FamilyMemberStatus, locationNote?: string) => {
      applyData(
        await fetchJson<DashboardData>('/api/member_checkin', {
          method: 'POST',
          body: JSON.stringify({ memberId, status, locationNote }),
        }),
      );
    },
    [applyData],
  );

  const value = useMemo<AppState>(
    () => ({
      ...data,
      loading,
      error,
      isMonitoring: data.agentRuns.some((run) => run.status === 'running' || run.status === 'completed'),
      reload,
      saveHousehold,
      startMonitoring,
      refreshIncident,
      approveAction,
      rejectAction,
      recordMemberCheckIn,
    }),
    [
      data,
      loading,
      error,
      reload,
      saveHousehold,
      startMonitoring,
      refreshIncident,
      approveAction,
      rejectAction,
      recordMemberCheckIn,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
