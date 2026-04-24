/**
 * Mock Agent Execution Subgraph Server
 * Lightweight GraphQL server for local development.
 */
import { createServer } from "http";

const MOCK_EXECUTIONS = [
  {
    id: "exec-001",
    agentId: "github-pr-monitor",
    status: "COMPLETED",
    input: '{"repo": "acme/backend", "staleDays": 7}',
    output: '{"stalePRs": [{"title": "Fix auth bug", "daysSinceUpdate": 12}]}',
    startedAt: "2026-04-23T10:00:00Z",
    completedAt: "2026-04-23T10:00:05Z",
    durationMs: 5200,
    error: null,
  },
  {
    id: "exec-002",
    agentId: "slack-summarizer",
    status: "RUNNING",
    input: '{"channel": "#engineering", "period": "daily"}',
    output: null,
    startedAt: "2026-04-24T08:00:00Z",
    completedAt: null,
    durationMs: null,
    error: null,
  },
];

function resolveQuery(query, variables) {
  if (query.includes("execution(")) {
    const id = variables?.id || "";
    return { data: { execution: MOCK_EXECUTIONS.find((e) => e.id === id) || null } };
  }
  if (query.includes("recentExecutions")) {
    return { data: { recentExecutions: MOCK_EXECUTIONS } };
  }
  if (query.includes("executeAgent")) {
    const newExec = {
      id: `exec-${Date.now()}`,
      agentId: variables?.agentId || "unknown",
      status: "PENDING",
      input: variables?.input || "{}",
      output: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: null,
      error: null,
    };
    return { data: { executeAgent: newExec } };
  }
  if (query.includes("cancelExecution")) {
    return {
      data: {
        cancelExecution: { ...(MOCK_EXECUTIONS[1] || {}), status: "CANCELLED" },
      },
    };
  }
  // Federation entity resolution
  if (query.includes("_entities")) {
    const representations = variables?.representations || [];
    const entities = representations.map((ref) => ({
      id: ref.id,
      executions: MOCK_EXECUTIONS.filter((e) => e.agentId === ref.id),
      runtimeStatus: "READY",
    }));
    return { data: { _entities: entities } };
  }
  if (query.includes("_service")) {
    return { data: { _service: { sdl: "" } } };
  }
  return { data: {} };
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200);
    return res.end("OK");
  }
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { query, variables } = JSON.parse(body);
        const result = resolveQuery(query, variables);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ errors: [{ message: e.message }] }));
      }
    });
  } else {
    res.writeHead(405);
    res.end();
  }
});

server.listen(4002, () => console.log("Agent Execution subgraph running on :4002"));
