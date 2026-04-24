# SafeSignal

Originally created for a hackathon (Swarm-Agents): family coordination and agent-assisted workflows with human approval.

**SafeSignal** is a family-focused wildfire response MVP built as a [Next.js](https://nextjs.org/) web app. It helps households monitor an incident, see **source-backed** information, coordinate **who is safe and who needs help**, and run **human-approved** agent-assisted actions—including optional **voice check-ins** via [Vapi](https://vapi.ai/).

It is **not** an emergency service. For immediate danger, use **911** or your local emergency number.

---

## What problem does SafeSignal solve?

During a wildfire, families often face several overlapping problems:

1. **Information overload and mistrust** — Official updates, social posts, and utility notices arrive in different places, at different speeds, and with different reliability. SafeSignal surfaces **discovered sources** with a **trust model** (for example official vs general web) and ties summaries back to URLs so decisions are **evidence-linked**, not “black box.”

2. **Coordination under stress** — It is hard to track **each member’s status**, location notes, pets, vehicles, and medical dependencies in one place. The **Household** and **Family Status** views centralize that profile and live board.

3. **Unsafe automation** — Letting an AI “do things” during a crisis (alerts, calls, shelter-related steps) without oversight is risky. SafeSignal uses an **approval queue**: sensitive actions stay **draft / pending** until a human **approves or rejects** them.

4. **Accountability** — After the fact, families and builders need to know **what was proposed, what ran, and why**. The **Evidence** area groups **proof** (sources, transcripts, audit traces) and an **action timeline** so outcomes are inspectable.

5. **Voice when text is not enough** — Optional **Vapi** flows support **browser voice** and **outbound-style** check-ins for members who **opt in**, so status can be captured by conversation as well as manual updates.

SafeSignal does **not** replace incident command, official alerts, or professional advice. It is a **coordination and transparency layer** for a single household’s response plan, designed **safe-by-default** (demo mode, draft-only external forms in the MVP, explicit consent flags).

---

## What the app does (feature overview)

| Area | Purpose |
|------|--------|
| **Monitor** (`/`) | Dashboard cards, **discovered sources**, **incident map** (MapLibre), **family status**, **approval queue**, **action timeline**, **recent proof**. Start or refresh monitoring from the header. |
| **Plan** (`/plan`) | **Next actions**, approvals alongside **matched resources** (shelters, roads, outages, charging, etc.). Reminder: external shelter forms are **drafts only** in this MVP—nothing is auto-submitted to third-party emergency sites. |
| **Voice** (`/voice`) | **Voice Command Center** (Vapi Web SDK) and **call history** with transcripts and outcomes. |
| **Evidence** (`/evidence`) | **Proof vault**, **audit events** (permission scopes and decisions), and full **timeline**. |
| **Household** (`/household`) | **Onboarding / profile**: address, region, supplies, pets, vehicles, medical notes, **outbound voice consent**, and per-member **voice consent**; saved profile with **family board**. |

The shell shows **Demo fallback** vs **Live MVP**, the active incident title, and shortcuts to **Edit household** / **Start monitor** / **Refresh monitor**.

---

## How it works (architecture)

- **Frontend**: Next.js **App Router**, React **19**, Tailwind **4**, client state in `lib/store.tsx` with periodic refresh (~20s) from `/api/dashboard`.
- **Data path**: `GET /api/dashboard` tries **InsForge-backed** live data (`lib/services/insforge-repository.ts`); on failure or missing config it falls back to **`getDashboardData()`** from `lib/runtime-store.ts` (demo / in-memory shaped data).
- **Wildfire monitoring & sources**: Server routes orchestrate **TinyFish** Search / Fetch (and related flows) via `lib/services/tinyfish.ts` and `lib/services/wildfire-monitor.ts` for discovery and extraction aligned to the active incident.
- **Voice**: **Vapi** public key + assistant in the browser; server SDK, webhooks, and tools under `app/api/vapi_*` and `lib/services/vapi.ts` for server-driven configuration and call lifecycle.
- **Snapshots (optional)**: **Ghost** metadata for incident snapshot / fork simulation (`lib/services/ghost.ts`, `create_ghost_snapshot` API).
- **Governance adapter**: **Guild.ai**-shaped audit fields (`audit_events`, `guildTraceId` on types) are wired for future or alternate live APIs; see `lib/services/guild.ts`.

Persistence for “live” mode is intended to live on **InsForge** (Postgres + optional storage). The schema is in `insforge.schema.sql` (households, members, incidents, sources, resources, approvals, timeline, evidence, voice calls, agent runs, etc.).

---

## Operating modes

| Mode | When | Behavior |
|------|------|----------|
| **Demo** | `NEXT_PUBLIC_DEMO_MODE=true` (typical local default) | Uses built-in / runtime demo data; no full backend required to explore the UI. |
| **Live MVP** | `NEXT_PUBLIC_DEMO_MODE=false` with InsForge, TinyFish, Vapi, and optional Ghost/Guild configuration | Reads/writes through InsForge and integrated services as implemented in `app/api/*`. |

The UI surfaces which mode is active so you never confuse a simulation with live incident data.

---

## Safety and product boundaries

- **Not an emergency authority** — Always use official channels and emergency services for life-threatening situations.
- **Approval-gated actions** — Risky or outbound steps should appear in the **approval queue** until explicitly approved.
- **MVP external submissions** — Prepared shelter / aid **web forms** are **drafts only**; the app does **not** auto-submit them in this version.
- **Voice** — Outbound-style flows respect **household** and **per-member** consent flags in the domain model.

---

## Prerequisites

- **Node.js** (LTS recommended) and **npm**
- For live mode: accounts/keys for **InsForge**, **TinyFish**, **Vapi**, and optionally **Ghost** / **Guild** as you wire them

---

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Fill `.env.local` using `.env.example`:

- **`APP_URL`** — Public origin used for Vapi tool and webhook URLs (e.g. `http://localhost:3000` in dev).
- **InsForge** — `NEXT_PUBLIC_INSFORGE_BASE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, optional `INSFORGE_SERVICE_ROLE_KEY` for server writes when anon is restricted. Base URL may also be set via `NEXT_PUBLIC_INSFORGE_URL` as noted in the example file.
- **TinyFish** — `TINYFISH_API_KEY` for Search/Fetch automation.
- **Vapi** — `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `NEXT_PUBLIC_VAPI_ASSISTANT_ID` (browser); `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID` (server / outbound). Dashboard copy (first message, system prompt, tools): [`docs/vapi-assistant.md`](docs/vapi-assistant.md).
- **Ghost** (optional) — `GHOST_DATABASE_ID`, `GHOST_FORK_ID` for snapshot metadata.

---

## Backend setup (InsForge)

1. Create an **InsForge** project and link it (see InsForge CLI docs; your project may include `.insforge/project.json` after `npx @insforge/cli link`).
2. Apply **`insforge.schema.sql`** to the project database.
3. Create an InsForge **Storage** bucket named **`evidence`** for proof artifacts if you use file/screenshot flows.
4. Configure secrets / env vars to match `.env.example`.
5. For production, plan to run **`app/api/*`** route handlers on your chosen host or migrate equivalent logic to **InsForge Edge Functions** as described in your deployment guide.

---

## API routes (high level)

| Route | Role |
|-------|------|
| `GET /api/dashboard` | Aggregated dashboard payload (live InsForge first, else demo). |
| `POST /api/household` | Save or update household profile. |
| `POST /api/start_wildfire_monitor` | Start incident monitoring pipeline. |
| `POST /api/refresh_incident` | Refresh incident and related sources/resources. |
| `POST /api/approve_action` | Approve or reject a queued action. |
| `POST /api/member_checkin` | Record a member check-in status. |
| `POST /api/create_ghost_snapshot` | Optional Ghost snapshot handoff. |
| `GET/POST /api/vapi_config`, `vapi_webhook`, `vapi_tools` | Vapi assistant config, webhooks, and tool endpoints. |

Exact payloads match the TypeScript types in `lib/types.ts`.

---

## Verification

```bash
npm run lint
npm run build
```

---

## Tech stack (summary)

- **Framework**: Next.js **15**, React **19**, TypeScript
- **UI**: Tailwind CSS **4**, Lucide icons, Motion, Recharts (where used)
- **Maps**: MapLibre GL + react-map-gl
- **Backend / data**: InsForge SDK + Postgres schema in-repo
- **Automation / search**: TinyFish APIs
- **Voice**: `@vapi-ai/web`, `@vapi-ai/server-sdk`

---

## Repository layout (quick reference)

- `app/` — Routes and API handlers
- `components/` — Dashboard, map, voice, onboarding, queues, cards
- `lib/types.ts` — Domain model shared by UI and API
- `lib/store.tsx` — Client app state and mutations
- `lib/services/` — InsForge, TinyFish, Vapi, Ghost, Guild, wildfire monitor
- `insforge.schema.sql` — Database DDL for live mode

---

## License and status

This repository is an **MVP** (`package.json` may still reference a generic name like `ai-studio-applet`); treat deployment keys as **secrets** and rotate if exposed.

For questions about extending live Guild integration, production RLS on InsForge tables, or regional compliance for voice recording, plan those explicitly before going beyond demo use.
