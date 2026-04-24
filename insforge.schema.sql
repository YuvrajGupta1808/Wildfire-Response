-- SafeSignal MVP public schema for InsForge Postgres.
-- Public tables are exposed by InsForge/PostgREST; enable RLS policies in the project for production.

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  home_address text not null,
  region text not null,
  emergency_preferences jsonb not null default '{}'::jsonb,
  emergency_contacts jsonb not null default '[]'::jsonb,
  outbound_voice_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  role text not null,
  status text not null default 'unknown',
  location text not null default '',
  location_note text not null default '',
  needs jsonb not null default '[]'::jsonb,
  contact_method text not null default '',
  phone text,
  pets jsonb not null default '[]'::jsonb,
  vehicles jsonb not null default '[]'::jsonb,
  medical_dependencies jsonb not null default '[]'::jsonb,
  battery_level integer,
  last_check_in timestamptz,
  voice_consent boolean not null default false,
  updated_by text not null default 'user'
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  external_id text,
  location text not null,
  status text not null default 'unknown',
  evacuation_status text not null default 'unknown',
  latitude double precision not null,
  longitude double precision not null,
  perimeter jsonb,
  monitored_sources jsonb not null default '[]'::jsonb,
  last_refreshed_at timestamptz not null default now(),
  ghost_snapshot_id text
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  incident_id uuid not null references incidents(id) on delete cascade,
  url text not null,
  title text not null,
  source_type text not null,
  trust_score numeric not null default 0,
  fetched_at timestamptz not null default now(),
  extracted_summary text not null default ''
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  incident_id uuid not null references incidents(id) on delete cascade,
  type text not null,
  name text not null,
  address text not null default '',
  distance text not null default '',
  status text not null default 'unknown',
  capacity text,
  accepts_pets boolean,
  accessibility jsonb not null default '[]'::jsonb,
  phone text,
  url text,
  source_id uuid references sources(id) on delete set null,
  confidence numeric not null default 0,
  latitude double precision not null,
  longitude double precision not null
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  task text not null,
  status text not null,
  sponsor_tool text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  result_summary text,
  error text
);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  action_type text not null,
  title text not null,
  description text not null,
  risk_level text not null,
  prepared_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  prepared_at timestamptz not null default now(),
  decided_at timestamptz,
  executed_at timestamptz,
  failure_reason text,
  guild_trace_id text
);

create table if not exists voice_calls (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  vapi_call_id text,
  direction text not null,
  member_id uuid references members(id) on delete set null,
  member_name text,
  status text not null,
  transcript text not null default '',
  extracted_status text,
  duration_seconds integer,
  outcome text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists evidence_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  approval_request_id uuid references approval_requests(id) on delete set null,
  voice_call_id uuid references voice_calls(id) on delete set null,
  kind text not null,
  source_url text,
  storage_path text,
  extracted_data text not null default '',
  trust_level text not null default '',
  guild_trace_id text,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  guild_run_id text not null,
  actor text not null,
  permission_scope text not null,
  tool_call text not null,
  decision text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_household on members(household_id);
create index if not exists idx_incidents_household on incidents(household_id);
create index if not exists idx_sources_incident on sources(incident_id);
create index if not exists idx_resources_incident on resources(incident_id);
create index if not exists idx_approvals_household on approval_requests(household_id, status);
create index if not exists idx_evidence_household on evidence_items(household_id, created_at desc);
create index if not exists idx_audit_household on audit_events(household_id, created_at desc);
