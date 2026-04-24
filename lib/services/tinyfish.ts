import { randomUUID } from 'node:crypto';
import type { Household, SourceRecord } from '@/lib/types';

export type TinyFishSearchHit = {
  position?: number;
  site_name?: string;
  snippet?: string;
  title?: string;
  url: string;
};

export type TinyFishFetchResult = {
  url: string;
  final_url?: string;
  title?: string;
  description?: string;
  text?: string;
  language?: string;
};

export type TinyFishMonitorPayload = {
  searchHits: TinyFishSearchHit[];
  fetchResults: TinyFishFetchResult[];
};

const API_KEY = process.env.TINYFISH_API_KEY;

export function isTinyFishConfigured() {
  return Boolean(API_KEY);
}

export function classifySource(url: string): SourceRecord['sourceType'] {
  const host = new URL(url).hostname.toLowerCase();
  if (host.endsWith('.gov') || host.includes('fire.ca.gov') || host.includes('socoemergency')) {
    return 'official';
  }
  if (host.includes('pge') || host.includes('sce') || host.includes('sdge') || host.includes('utility')) {
    return 'utility';
  }
  if (host.includes('redcross') || host.includes('fema')) {
    return 'verified_nonprofit';
  }
  return 'general_web';
}

export function trustScoreFor(sourceType: SourceRecord['sourceType']) {
  switch (sourceType) {
    case 'official':
      return 0.98;
    case 'utility':
      return 0.86;
    case 'verified_nonprofit':
      return 0.8;
    case 'system':
      return 0.75;
    default:
      return 0.55;
  }
}

function normalizeSearchResults(raw: unknown): TinyFishSearchHit[] {
  if (!Array.isArray(raw)) return [];
  const out: TinyFishSearchHit[] = [];
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const url = typeof row.url === 'string' ? row.url : typeof row.link === 'string' ? row.link : '';
    if (!url) continue;
    out.push({
      position: typeof row.position === 'number' ? row.position : undefined,
      site_name: typeof row.site_name === 'string' ? row.site_name : undefined,
      snippet: typeof row.snippet === 'string' ? row.snippet : undefined,
      title: typeof row.title === 'string' ? row.title : undefined,
      url,
    });
  }
  return out;
}

export async function searchWildfireSources(query: string): Promise<TinyFishSearchHit[]> {
  if (!API_KEY) {
    return [];
  }

  const url = new URL('https://api.search.tinyfish.ai');
  url.searchParams.set('query', query);
  url.searchParams.set('location', 'US');
  url.searchParams.set('language', 'en');

  const response = await fetch(url, {
    headers: { 'X-API-Key': API_KEY },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`TinyFish Search failed: ${response.status}`);
  }

  const payload = (await response.json()) as { results?: unknown[] };
  return normalizeSearchResults(payload.results);
}

const SKIP_FETCH_HOSTS = /facebook\.|youtube\.|youtu\.be|tiktok\.|instagram\.|twitter\.|x\.com/i;

export function selectUrlsForFetch(hits: TinyFishSearchHit[], max = 5): string[] {
  const out: string[] = [];
  for (const hit of hits) {
    if (!hit.url.startsWith('http')) continue;
    try {
      if (SKIP_FETCH_HOSTS.test(new URL(hit.url).hostname)) continue;
    } catch {
      continue;
    }
    if (!out.includes(hit.url)) out.push(hit.url);
    if (out.length >= max) break;
  }
  return out;
}

export async function fetchTinyFishContents(urls: string[]): Promise<TinyFishFetchResult[]> {
  if (!API_KEY || urls.length === 0) {
    return [];
  }

  const response = await fetch('https://api.fetch.tinyfish.ai', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      urls: urls.slice(0, 10),
      format: 'markdown',
      links: false,
      image_links: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`TinyFish Fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    results?: TinyFishFetchResult[];
    errors?: unknown[];
  };
  return Array.isArray(payload.results) ? payload.results : [];
}

export function buildWildfireSearchQuery(household: Household | null): string {
  const region = household?.region ?? 'Sonoma County, California';
  const addr = household?.homeAddress ?? 'Santa Rosa, CA';
  return `${region} wildfire evacuation shelter road closure official CAL FIRE near ${addr}`;
}

export function searchHitsToSourceRecords(
  hits: TinyFishSearchHit[],
  householdId: string,
  incidentId: string,
  fetchedAt: string,
): SourceRecord[] {
  return hits.slice(0, 15).map((hit) => {
    const sourceType = classifySource(hit.url);
    return {
      id: `src_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      householdId,
      incidentId,
      url: hit.url,
      title: hit.title ?? hit.site_name ?? hit.url,
      sourceType,
      trustScore: trustScoreFor(sourceType),
      fetchedAt,
      extractedSummary: hit.snippet ?? '',
    };
  });
}

export function clipText(text: string, max = 4000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/** Search + fetch top pages (same flow as TinyFish MCP: search → fetch_content). */
export async function loadTinyFishMonitorPayload(query: string): Promise<TinyFishMonitorPayload> {
  const searchHits = await searchWildfireSources(query);
  const urls = selectUrlsForFetch(searchHits, 5);
  const fetchResults = urls.length ? await fetchTinyFishContents(urls) : [];
  return { searchHits, fetchResults };
}

export async function runTinyFishAgentSse(url: string, goal: string) {
  if (!API_KEY) {
    return [];
  }

  const response = await fetch('https://agent.tinyfish.ai/v1/automation/run-sse', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, goal, browser_profile: 'lite' }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`TinyFish Agent SSE failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: unknown[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          events.push(JSON.parse(line.slice(6)));
        } catch {
          events.push({ type: 'RAW', line });
        }
      }
    }
  }

  return events;
}
