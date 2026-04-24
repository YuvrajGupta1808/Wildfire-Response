-- Schema for the agent marketplace database.
-- Compatible with Ghost (ghost.build) managed Postgres and local Postgres.
-- Uses pgvector for semantic search and pg_trgm/tsvector for keyword search.

-- Enable extensions (Ghost Postgres includes these; local Postgres may need manual install)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Agents table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'llm',          -- llm | code | hybrid
    status      TEXT NOT NULL DEFAULT 'draft',        -- draft | active | archived
    guild_id    TEXT,                                  -- Guild.ai agent ID
    cosmo_subgraph TEXT,                              -- WunderGraph Cosmo subgraph name
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    embedding   vector(384),                          -- sentence-transformer dimension
    search_vec  tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED
);

CREATE INDEX IF NOT EXISTS idx_agents_embedding ON agents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);
CREATE INDEX IF NOT EXISTS idx_agents_search_vec ON agents USING gin (search_vec);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents (status);

-- ── Sessions table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    context     JSONB NOT NULL DEFAULT '{}',
    messages    JSONB NOT NULL DEFAULT '[]',
    fork_schema TEXT,                                  -- schema name if forked
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions (agent_id);

-- ── Results table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS results (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
    data        JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_agent_id ON results (agent_id);
CREATE INDEX IF NOT EXISTS idx_results_session_id ON results (session_id);

-- ── Error logs table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS error_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    error       TEXT NOT NULL,
    stack_trace TEXT,
    attempt     INTEGER NOT NULL DEFAULT 1,
    resolved    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_agent_id ON error_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs (resolved);
