"""Ghost (ghost.build) database client with local SQLite fallback.

Provides a unified async interface for database operations that works with:
1. Ghost managed Postgres (production) via asyncpg
2. Local SQLite (development) via aiosqlite — no external dependencies needed
"""

from __future__ import annotations

import json
import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class AgentRecord:
    """Typed representation of an agent row."""
    id: str
    name: str
    description: str = ""
    type: str = "llm"
    status: str = "draft"
    guild_id: str | None = None
    cosmo_subgraph: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    embedding: list[float] | None = None


@dataclass
class SessionRecord:
    """Typed representation of a session row."""
    id: str
    agent_id: str
    context: dict = field(default_factory=dict)
    messages: list = field(default_factory=list)
    fork_schema: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: datetime | None = None


@dataclass
class ResultRecord:
    """Typed representation of a result row."""
    id: str
    agent_id: str
    session_id: str | None = None
    data: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ErrorLogRecord:
    """Typed representation of an error log row."""
    id: str
    agent_id: str
    error: str
    stack_trace: str | None = None
    attempt: int = 1
    resolved: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class DBClient(ABC):
    """Abstract database client interface matching Ghost capabilities."""

    @abstractmethod
    async def initialize(self) -> None:
        """Create tables / run migrations."""

    @abstractmethod
    async def close(self) -> None:
        """Close the database connection."""

    # ── Agent CRUD ───────────────────────────────────────────────────────
    @abstractmethod
    async def create_agent(self, name: str, description: str = "",
                           agent_type: str = "llm", **kwargs: Any) -> AgentRecord: ...

    @abstractmethod
    async def get_agent(self, agent_id: str) -> AgentRecord | None: ...

    @abstractmethod
    async def list_agents(self, status: str | None = None) -> list[AgentRecord]: ...

    @abstractmethod
    async def update_agent(self, agent_id: str, **kwargs: Any) -> AgentRecord | None: ...

    @abstractmethod
    async def delete_agent(self, agent_id: str) -> bool: ...

    # ── Session CRUD ─────────────────────────────────────────────────────
    @abstractmethod
    async def create_session(self, agent_id: str, context: dict | None = None) -> SessionRecord: ...

    @abstractmethod
    async def get_session(self, session_id: str) -> SessionRecord | None: ...

    @abstractmethod
    async def end_session(self, session_id: str) -> bool: ...

    # ── Results ──────────────────────────────────────────────────────────


class GhostClient(DBClient):
    """Client for Ghost managed Postgres (production).

    Connects via asyncpg using GHOST_CONNECTION_STRING.
    Falls back to Ghost REST API if connection string is not available.
    """

    def __init__(self, connection_string: str):
        self._conn_string = connection_string
        self._pool = None

    async def initialize(self) -> None:
        try:
            import asyncpg
        except ImportError:
            raise ImportError("asyncpg is required for GhostClient: pip install asyncpg")
        self._pool = await asyncpg.create_pool(self._conn_string, min_size=1, max_size=5)
        schema_path = Path(__file__).parent / "schema.sql"
        if schema_path.exists():
            async with self._pool.acquire() as conn:
                await conn.execute(schema_path.read_text())
        logger.info("GhostClient initialized with managed Postgres")

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    async def create_agent(self, name: str, description: str = "",
                           agent_type: str = "llm", **kwargs: Any) -> AgentRecord:
        agent_id = str(uuid.uuid4())
        embedding = kwargs.get("embedding")
        guild_id = kwargs.get("guild_id")
        cosmo_subgraph = kwargs.get("cosmo_subgraph")
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO agents (id, name, description, type, guild_id, cosmo_subgraph, embedding)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                agent_id, name, description, agent_type, guild_id, cosmo_subgraph,
                str(embedding) if embedding else None,
            )
        return AgentRecord(id=agent_id, name=name, description=description,
                           type=agent_type, guild_id=guild_id, cosmo_subgraph=cosmo_subgraph,
                           embedding=embedding)

    async def get_agent(self, agent_id: str) -> AgentRecord | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM agents WHERE id = $1", agent_id)
        return self._row_to_agent(row) if row else None

    async def list_agents(self, status: str | None = None) -> list[AgentRecord]:
        async with self._pool.acquire() as conn:
            if status:
                rows = await conn.fetch("SELECT * FROM agents WHERE status = $1 ORDER BY created_at DESC", status)
            else:
                rows = await conn.fetch("SELECT * FROM agents ORDER BY created_at DESC")
        return [self._row_to_agent(r) for r in rows]

    async def update_agent(self, agent_id: str, **kwargs: Any) -> AgentRecord | None:
        sets, vals, idx = [], [], 1
        for key in ("name", "description", "type", "status", "guild_id", "cosmo_subgraph"):
            if key in kwargs:
                sets.append(f"{key} = ${idx}")
                vals.append(kwargs[key])
                idx += 1
        if not sets:
            return await self.get_agent(agent_id)
        sets.append(f"updated_at = ${idx}")
        vals.append(datetime.now(timezone.utc))
        idx += 1
        vals.append(agent_id)
        async with self._pool.acquire() as conn:
            await conn.execute(f"UPDATE agents SET {', '.join(sets)} WHERE id = ${idx}", *vals)
        return await self.get_agent(agent_id)

    async def delete_agent(self, agent_id: str) -> bool:
        async with self._pool.acquire() as conn:
            result = await conn.execute("DELETE FROM agents WHERE id = $1", agent_id)
        return result == "DELETE 1"

    async def create_session(self, agent_id: str, context: dict | None = None) -> SessionRecord:
        sid = str(uuid.uuid4())
        ctx = context or {}
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO sessions (id, agent_id, context) VALUES ($1, $2, $3)",
                sid, agent_id, json.dumps(ctx),
            )
        return SessionRecord(id=sid, agent_id=agent_id, context=ctx)

    async def get_session(self, session_id: str) -> SessionRecord | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
        if not row:
            return None
        return SessionRecord(id=str(row["id"]), agent_id=str(row["agent_id"]),
                             context=json.loads(row["context"]) if isinstance(row["context"], str) else row["context"],
                             messages=json.loads(row["messages"]) if isinstance(row["messages"], str) else row["messages"],
                             fork_schema=row["fork_schema"], created_at=row["created_at"], ended_at=row["ended_at"])

    async def end_session(self, session_id: str) -> bool:
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                "UPDATE sessions SET ended_at = $1 WHERE id = $2",
                datetime.now(timezone.utc), session_id,
            )
        return "UPDATE 1" in result

    async def store_result(self, agent_id: str, data: dict,
                           session_id: str | None = None) -> ResultRecord:
        rid = str(uuid.uuid4())
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO results (id, agent_id, session_id, data) VALUES ($1, $2, $3, $4)",
                rid, agent_id, session_id, json.dumps(data),
            )
        return ResultRecord(id=rid, agent_id=agent_id, session_id=session_id, data=data)

    async def get_results(self, agent_id: str, limit: int = 50) -> list[ResultRecord]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM results WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2",
                agent_id, limit,
            )
        return [ResultRecord(id=str(r["id"]), agent_id=str(r["agent_id"]),
                             session_id=str(r["session_id"]) if r["session_id"] else None,
                             data=json.loads(r["data"]) if isinstance(r["data"], str) else r["data"],
                             created_at=r["created_at"]) for r in rows]

    async def log_error(self, agent_id: str, error: str,
                        stack_trace: str | None = None, attempt: int = 1) -> ErrorLogRecord:
        eid = str(uuid.uuid4())
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO error_logs (id, agent_id, error, stack_trace, attempt) VALUES ($1, $2, $3, $4, $5)",
                eid, agent_id, error, stack_trace, attempt,
            )
        return ErrorLogRecord(id=eid, agent_id=agent_id, error=error,
                              stack_trace=stack_trace, attempt=attempt)

    async def get_errors(self, agent_id: str, unresolved_only: bool = False) -> list[ErrorLogRecord]:
        async with self._pool.acquire() as conn:
            q = "SELECT * FROM error_logs WHERE agent_id = $1"
            if unresolved_only:
                q += " AND resolved = false"
            q += " ORDER BY created_at DESC"
            rows = await conn.fetch(q, agent_id)
        return [ErrorLogRecord(id=str(r["id"]), agent_id=str(r["agent_id"]),
                               error=r["error"], stack_trace=r["stack_trace"],
                               attempt=r["attempt"], resolved=r["resolved"],
                               created_at=r["created_at"]) for r in rows]

    async def resolve_error(self, error_id: str) -> bool:
        async with self._pool.acquire() as conn:
            result = await conn.execute("UPDATE error_logs SET resolved = true WHERE id = $1", error_id)
        return "UPDATE 1" in result

    async def execute_sql(self, query: str, params: list | None = None) -> list[dict]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *(params or []))
        return [dict(r) for r in rows]

    async def get_schema_info(self) -> list[dict]:
        return await self.execute_sql(
            """SELECT table_name, column_name, data_type, is_nullable
               FROM information_schema.columns
               WHERE table_schema = 'public'
               ORDER BY table_name, ordinal_position"""
        )

    @staticmethod
    def _row_to_agent(row) -> AgentRecord:
        return AgentRecord(
            id=str(row["id"]), name=row["name"], description=row["description"],
            type=row["type"], status=row["status"], guild_id=row["guild_id"],
            cosmo_subgraph=row["cosmo_subgraph"], created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @abstractmethod
    async def store_result(self, agent_id: str, data: dict,
                           session_id: str | None = None) -> ResultRecord: ...

    @abstractmethod
    async def get_results(self, agent_id: str, limit: int = 50) -> list[ResultRecord]: ...

    # ── Error logs ───────────────────────────────────────────────────────
    @abstractmethod
    async def log_error(self, agent_id: str, error: str,
                        stack_trace: str | None = None, attempt: int = 1) -> ErrorLogRecord: ...

    @abstractmethod
    async def get_errors(self, agent_id: str, unresolved_only: bool = False) -> list[ErrorLogRecord]: ...

    @abstractmethod
    async def resolve_error(self, error_id: str) -> bool: ...

    # ── Raw SQL (for MCP tools) ──────────────────────────────────────────
    @abstractmethod
    async def execute_sql(self, query: str, params: list | None = None) -> list[dict]: ...

    @abstractmethod
    async def get_schema_info(self) -> list[dict]: ...
