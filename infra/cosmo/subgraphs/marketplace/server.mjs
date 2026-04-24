/**
 * Mock Marketplace Subgraph Server
 * Lightweight GraphQL server for local development.
 * Responds to introspection and basic queries.
 */
import { createServer } from "http";

const MOCK_AGENTS = [
  {
    id: "github-pr-monitor",
    name: "GitHub PR Monitor",
    description: "Monitors GitHub repos for stale pull requests",
    agentType: "LLM_AGENT",
    category: "monitoring",
    rating: 4.5,
    executionCount: 142,
    servicesUsed: ["@guildai-services/guildai~github"],
    createdAt: "2026-04-20T00:00:00Z",
    updatedAt: "2026-04-23T00:00:00Z",
    status: "ACTIVE",
  },
  {
    id: "slack-summarizer",
    name: "Slack Channel Summarizer",
    description: "Summarizes Slack channel activity into daily digests",
    agentType: "LLM_AGENT",
    category: "automation",
    rating: 4.2,
    executionCount: 89,
    servicesUsed: ["@guildai-services/guildai~slack"],
    createdAt: "2026-04-18T00:00:00Z",
    updatedAt: "2026-04-22T00:00:00Z",
    status: "ACTIVE",
  },
];

function resolveQuery(query, variables) {
  if (query.includes("availableAgents")) return { data: { availableAgents: MOCK_AGENTS } };
  if (query.includes("searchAgents")) {
    const q = (variables?.query || "").toLowerCase();
    const results = MOCK_AGENTS.filter(
      (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
    return { data: { searchAgents: results } };
  }
  if (query.includes("agent(")) {
    const id = variables?.id || "";
    return { data: { agent: MOCK_AGENTS.find((a) => a.id === id) || null } };
  }
  // Federation entity resolution
  if (query.includes("_entities")) {
    const representations = variables?.representations || [];
    const entities = representations.map((ref) => MOCK_AGENTS.find((a) => a.id === ref.id) || null);
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

server.listen(4001, () => console.log("Marketplace subgraph running on :4001"));
