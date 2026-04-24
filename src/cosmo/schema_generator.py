"""Subgraph Schema Generator for WunderGraph Cosmo.

Takes agent metadata (from CodeGenerator's GeneratedAgent) and produces
a GraphQL SDL subgraph schema that can be registered with Cosmo.

Each agent becomes its own subgraph with:
- Query: get agent info, last execution, results
- Mutation: execute the agent
- Types: input/output based on the agent's Zod schemas
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Mapping from Zod-like type hints to GraphQL scalar types
ZOD_TO_GRAPHQL = {
    "z.string()": "String",
    "z.number()": "Int",
    "z.boolean()": "Boolean",
    "z.array(z.string())": "[String!]",
    "z.array(z.number())": "[Int!]",
}


@dataclass
class SubgraphSchema:
    """A generated GraphQL subgraph schema."""

    agent_id: str
    sdl: str
    subgraph_name: str


def _sanitize_name(name: str) -> str:
    """Convert an agent ID/name to a valid GraphQL type name (PascalCase)."""
    parts = re.split(r"[-_\s]+", name)
    return "".join(p.capitalize() for p in parts if p)


def _graphql_type(zod_type: str) -> str:
    """Map a Zod type string to a GraphQL type."""
    return ZOD_TO_GRAPHQL.get(zod_type, "String")


def _infer_graphql_type(description: str) -> str:
    """Infer a GraphQL type from a field description (mirrors code_generator logic)."""
    desc_lower = description.lower()
    if any(w in desc_lower for w in ("number", "count", "total", "days", "amount")):
        return "Int"
    if any(w in desc_lower for w in ("boolean", "flag", "enabled", "success")):
        return "Boolean"
    if any(w in desc_lower for w in ("list", "array")):
        return "[String!]"
    return "String"


class SubgraphSchemaGenerator:
    """Generates GraphQL subgraph SDL from agent metadata.

    Usage:
        gen = SubgraphSchemaGenerator()
        schema = gen.generate(
            agent_id="github-pr-monitor",
            description="Monitors GitHub repos for stale PRs",
            input_fields={"repo": "GitHub repository name", "staleDays": "Number of days"},
            output_fields={"stalePRs": "List of stale PR titles"},
        )
        print(schema.sdl)
    """

    FEDERATION_HEADER = (
        'extend schema\n'
        '  @link(url: "https://specs.apollo.dev/federation/v2.5",'
        ' import: ["@key", "@shareable"])\n'
    )

    def generate(
        self,
        agent_id: str,
        description: str,
        input_fields: dict[str, str] | None = None,
        output_fields: dict[str, str] | None = None,
        agent_type: str = "LLM_AGENT",
    ) -> SubgraphSchema:
        """Generate a subgraph SDL for an agent.

        Args:
            agent_id: Unique agent identifier (e.g. "github-pr-monitor").
            description: Human-readable agent description.
            input_fields: Dict of field_name → description for the agent's input.
            output_fields: Dict of field_name → description for the agent's output.
            agent_type: "LLM_AGENT" or "CODED_AGENT".

        Returns:
            SubgraphSchema with the generated SDL.
        """
        input_fields = input_fields or {}
        output_fields = output_fields or {}

        type_name = _sanitize_name(agent_id)
        subgraph_name = agent_id.lower().replace(" ", "-")

        input_type = f"{type_name}Input"
        output_type = f"{type_name}Output"
        result_type = f"{type_name}Result"

        lines: list[str] = []
        lines.append(f"# Auto-generated subgraph for agent: {agent_id}")
        lines.append(self.FEDERATION_HEADER)

        # Input type
        lines.append(f'"""Input for {description}."""')
        lines.append(f"input {input_type} {{")
        if input_fields:
            for fname, fdesc in input_fields.items():
                gql_type = _infer_graphql_type(fdesc)
                lines.append(f'  """{fdesc}"""')
                lines.append(f"  {fname}: {gql_type}")
        else:
            lines.append('  """Raw JSON input."""')
            lines.append("  rawInput: String")
        lines.append("}\n")

        # Output type
        lines.append(f'"""Output from {description}."""')
        lines.append(f"type {output_type} {{")
        if output_fields:
            for fname, fdesc in output_fields.items():
                gql_type = _infer_graphql_type(fdesc)
                lines.append(f'  """{fdesc}"""')
                lines.append(f"  {fname}: {gql_type}")
        else:
            lines.append('  """Raw JSON output."""')
            lines.append("  rawOutput: String")
        lines.append("}\n")

        # Result type (wraps execution metadata + output)
        lines.append(f"type {result_type} {{")
        lines.append("  executionId: ID!")
        lines.append("  status: String!")
        lines.append(f"  output: {output_type}")
        lines.append("  error: String")
        lines.append("  durationMs: Int")
        lines.append("}\n")

        # Entity type for federation
        lines.append(f'type {type_name}Agent @key(fields: "id") {{')
        lines.append("  id: ID!")
        lines.append(f'  name: String! # "{description}"')
        lines.append(f'  agentType: String! # "{agent_type}"')
        lines.append("  status: String!")
        lines.append(f"  lastResult: {result_type}")
        lines.append("}\n")

        # Query
        lines.append("type Query {")
        lines.append(f'  """{description}"""')
        lines.append(f"  {_to_camel(agent_id)}(id: ID!): {type_name}Agent")
        lines.append("}\n")

        # Mutation
        lines.append("type Mutation {")
        lines.append(f'  """Execute {description}."""')
        lines.append(
            f"  execute{type_name}(input: {input_type}!): {result_type}!"
        )
        lines.append("}")

        sdl = "\n".join(lines)

        return SubgraphSchema(
            agent_id=agent_id,
            sdl=sdl,
            subgraph_name=subgraph_name,
        )


def _to_camel(name: str) -> str:
    """Convert kebab/snake name to camelCase."""
    parts = re.split(r"[-_\s]+", name)
    if not parts:
        return name
    return parts[0].lower() + "".join(p.capitalize() for p in parts[1:])
