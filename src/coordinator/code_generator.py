"""
Guild.ai Agent Code Generator

Uses LangChain Deep Agents with Fireworks GLM-5.1 to analyze user requests
and generate valid Guild.ai agent TypeScript code (agent.ts files).
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from deepagents import create_deep_agent

from src.templates.llm_agent_template import LLM_AGENT_TEMPLATE, LLM_AGENT_EXAMPLE
from src.templates.coded_agent_template import CODED_AGENT_TEMPLATE, CODED_AGENT_EXAMPLE


class AgentType(str, Enum):
    """Supported Guild.ai agent types."""
    LLM = "llmAgent"
    CODED = "codedAgent"


# Guild.ai integration packages that can be used in generated agents
ALLOWED_GUILD_SERVICES = {
    "github": "@guildai-services/guildai~github",
    "slack": "@guildai-services/guildai~slack",
    "jira": "@guildai-services/guildai~jira",
    "figma": "@guildai-services/guildai~figma",
    "confluence": "@guildai-services/guildai~confluence",
    "linear": "@guildai-services/guildai~linear",
    "notion": "@guildai-services/guildai~notion",
    "gmail": "@guildai-services/guildai~gmail",
    "google_calendar": "@guildai-services/guildai~google-calendar",
    "google_drive": "@guildai-services/guildai~google-drive",
}

# Allowed imports in Guild.ai sandbox
ALLOWED_IMPORTS = [
    "@guildai/agents-sdk",
    "zod",
] + list(ALLOWED_GUILD_SERVICES.values())

DEFAULT_MODEL = "fireworks:accounts/fireworks/models/glm-5p1"


@dataclass
class GeneratedAgent:
    """Result of agent code generation."""
    code: str
    agent_type: AgentType
    description: str
    services_used: list[str] = field(default_factory=list)
    input_schema_fields: dict = field(default_factory=dict)
    output_schema_fields: dict = field(default_factory=dict)


# ── System prompt for the code-generation Deep Agent ────────────────────

CODEGEN_SYSTEM_PROMPT = f"""You are an expert Guild.ai agent code generator.

Your job is to take a user's natural language description of an agent and produce
a complete, valid Guild.ai agent TypeScript file (agent.ts).

## Rules
1. You MUST only use these imports:
   - `@guildai/agents-sdk` (for llmAgent, codedAgent, guildTools)
   - `zod` (for input/output schemas)
   - Guild service packages: {json.dumps(list(ALLOWED_GUILD_SERVICES.values()))}

2. Every agent MUST have:
   - Proper import statements
   - A Zod InputSchema with `.describe()` on each field
   - A Zod OutputSchema with `.describe()` on each field
   - A default export using either `llmAgent()` or `codedAgent()`

3. Choose the right agent type:
   - `llmAgent` — when the task requires reasoning, natural language, or multi-step decisions
   - `codedAgent` — when the task is deterministic, data transformation, or structured workflow

4. For llmAgent, always include:
   - `description`: one-line summary
   - `tools`: always spread `guildTools`, plus any service tools needed
   - `systemPrompt`: detailed instructions for the LLM
   - `mode`: "multi-turn" (default) or "single-turn"
   - `inputSchema` and `outputSchema`

5. For codedAgent, always include:
   - `description`: one-line summary
   - `inputSchema` and `outputSchema`
   - `handler`: async function with (input, ctx) => OutputType

## Example: llmAgent

```typescript
{LLM_AGENT_EXAMPLE}
```

## Example: codedAgent

```typescript
{CODED_AGENT_EXAMPLE}
```

## Output Format
Return ONLY the TypeScript code. No markdown fences, no explanations.
The code must be a complete, self-contained agent.ts file.
"""


class CodeGenerator:
    """Generates Guild.ai agent code from natural language descriptions.

    Uses LangChain Deep Agents with Fireworks GLM-5.1 to analyze the user's
    request and produce a complete agent.ts file.
    """

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        api_key: Optional[str] = None,
    ):
        self.model = model
        self.api_key = api_key or os.environ.get("FIREWORKS_API_KEY", "")

    def _create_agent(self):
        """Create the Deep Agent for code generation."""
        return create_deep_agent(
            model=self.model,
            system_prompt=CODEGEN_SYSTEM_PROMPT,
            tools=[],  # Code gen doesn't need external tools
        )

    def _build_prompt(self, request: str) -> str:
        """Build the prompt for the code generation agent."""
        return (
            f"Generate a Guild.ai agent.ts file for the following request:\n\n"
            f"{request}\n\n"
            f"Remember: Return ONLY valid TypeScript code. No markdown."
        )

    def _extract_code(self, raw_output: str) -> str:
        """Extract clean TypeScript code from agent output.

        Handles cases where the model wraps code in markdown fences.
        """
        # Strip markdown code fences if present
        code = raw_output.strip()

        # Remove ```typescript ... ``` or ```ts ... ```
        fence_pattern = r"^```(?:typescript|ts)?\s*\n(.*?)```\s*$"
        match = re.search(fence_pattern, code, re.DOTALL)
        if match:
            code = match.group(1).strip()

        return code

    def _detect_agent_type(self, code: str) -> AgentType:
        """Detect whether generated code uses llmAgent or codedAgent."""
        if "codedAgent(" in code:
            return AgentType.CODED
        return AgentType.LLM

    def _detect_services(self, code: str) -> list[str]:
        """Detect which Guild service packages are used."""
        services = []
        for name, package in ALLOWED_GUILD_SERVICES.items():
            if package in code:
                services.append(package)
        return services

    def _validate_imports(self, code: str) -> list[str]:
        """Validate that only allowed imports are used. Returns list of errors."""
        errors = []
        import_pattern = r'from\s+"([^"]+)"'
        imports = re.findall(import_pattern, code)

        for imp in imports:
            if imp not in ALLOWED_IMPORTS:
                errors.append(
                    f"Disallowed import: '{imp}'. "
                    f"Only these are allowed: {ALLOWED_IMPORTS}"
                )
        return errors

    def _validate_structure(self, code: str) -> list[str]:
        """Validate the structural requirements of generated code."""
        errors = []

        if "export default" not in code:
            errors.append("Missing 'export default' — agent must have a default export")

        if "InputSchema" not in code and "inputSchema" not in code:
            errors.append("Missing input schema definition")

        if "OutputSchema" not in code and "outputSchema" not in code:
            errors.append("Missing output schema definition")

        if 'from "zod"' not in code and "from 'zod'" not in code:
            errors.append("Missing zod import for schema definitions")

        if '@guildai/agents-sdk' not in code:
            errors.append("Missing @guildai/agents-sdk import")

        return errors

    def validate(self, code: str) -> list[str]:
        """Run all validations on generated code. Returns list of errors."""
        errors = []
        errors.extend(self._validate_imports(code))
        errors.extend(self._validate_structure(code))
        return errors

    async def generate(self, request: str) -> GeneratedAgent:
        """Generate Guild.ai agent code from a natural language request.

        Args:
            request: Natural language description of the desired agent.

        Returns:
            GeneratedAgent with the generated code and metadata.

        Raises:
            ValueError: If generated code fails validation.
            RuntimeError: If the Deep Agent fails to produce output.
        """
        agent = self._create_agent()
        prompt = self._build_prompt(request)

        # Invoke the Deep Agent
        result = await agent.ainvoke({"input": prompt})

        raw_output = result.get("output", "")
        if not raw_output:
            raise RuntimeError("Deep Agent returned empty output")

        code = self._extract_code(raw_output)

        # Validate
        errors = self.validate(code)
        if errors:
            raise ValueError(
                f"Generated code has {len(errors)} validation error(s):\n"
                + "\n".join(f"  - {e}" for e in errors)
            )

        agent_type = self._detect_agent_type(code)
        services = self._detect_services(code)

        # Extract description from the code
        desc_match = re.search(r'description:\s*["\'](.+?)["\']', code)
        description = desc_match.group(1) if desc_match else request[:100]

        return GeneratedAgent(
            code=code,
            agent_type=agent_type,
            description=description,
            services_used=services,
        )

    def generate_from_template(
        self,
        agent_type: AgentType,
        description: str,
        system_prompt: str = "",
        services: Optional[list[str]] = None,
        input_fields: Optional[dict[str, str]] = None,
        output_fields: Optional[dict[str, str]] = None,
        handler_body: str = "",
        mode: str = "multi-turn",
    ) -> GeneratedAgent:
        """Generate agent code from templates without calling the LLM.

        This is a deterministic fallback for when the structure is known.
        """
        services = services or []
        input_fields = input_fields or {}
        output_fields = output_fields or {}

        # Build service imports
        service_imports = ""
        tool_spread = ""
        for svc in services:
            pkg = ALLOWED_GUILD_SERVICES.get(svc, "")
            if pkg:
                tool_name = f"{svc}Tools"
                service_imports += f'import {{ {tool_name} }} from "{pkg}"\n'
                tool_spread += f", ...{tool_name}"

        # Build Zod schemas
        input_schema = self._build_zod_schema("InputSchema", input_fields)
        output_schema = self._build_zod_schema("OutputSchema", output_fields)

        # Choose template
        if agent_type == AgentType.LLM:
            code = LLM_AGENT_TEMPLATE.format(
                service_imports=service_imports.strip(),
                input_schema=input_schema,
                output_schema=output_schema,
                description=json.dumps(description),
                tool_spread=tool_spread,
                system_prompt=json.dumps(system_prompt),
                mode=json.dumps(mode),
                input_output_config="  inputSchema: InputSchema,\n  outputSchema: OutputSchema,\n",
            )
        else:
            code = CODED_AGENT_TEMPLATE.format(
                service_imports=service_imports.strip(),
                input_schema=input_schema,
                output_schema=output_schema,
                description=json.dumps(description),
                handler_body=handler_body or '    return { success: true }',
            )

        return GeneratedAgent(
            code=code.strip(),
            agent_type=agent_type,
            description=description,
            services_used=[ALLOWED_GUILD_SERVICES.get(s, s) for s in services],
            input_schema_fields=input_fields,
            output_schema_fields=output_fields,
        )

    @staticmethod
    def _build_zod_schema(name: str, fields: dict[str, str]) -> str:
        """Build a Zod schema definition from field name → description pairs."""
        if not fields:
            return f"const {name} = z.object({{}})"

        lines = [f"const {name} = z.object({{"]
        for field_name, desc in fields.items():
            # Infer type from description keywords
            zod_type = "z.string()"
            desc_lower = desc.lower()
            if any(w in desc_lower for w in ["number", "count", "total", "days", "amount"]):
                zod_type = "z.number()"
            elif any(w in desc_lower for w in ["boolean", "flag", "enabled", "success"]):
                zod_type = "z.boolean()"
            elif any(w in desc_lower for w in ["list", "array"]):
                zod_type = "z.array(z.string())"

            lines.append(f'  {field_name}: {zod_type}.describe("{desc}"),')
        lines.append("})")
        return "\n".join(lines)
