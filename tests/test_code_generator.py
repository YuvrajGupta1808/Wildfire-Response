"""
Tests for the Guild.ai agent code generator.

Tests cover:
- Template-based generation (llmAgent and codedAgent)
- Code validation (imports, structure)
- Multiple agent type scenarios
- Edge cases and error handling
"""

import pytest

from src.coordinator.code_generator import (
    AgentType,
    CodeGenerator,
    GeneratedAgent,
    ALLOWED_IMPORTS,
    ALLOWED_GUILD_SERVICES,
)


@pytest.fixture
def generator():
    """Create a CodeGenerator instance (no API key needed for template tests)."""
    return CodeGenerator(api_key="test-key")


# ── Template-based generation tests ─────────────────────────────────────


class TestGenerateFromTemplate:
    """Test deterministic template-based code generation."""

    def test_llm_agent_github_pr_monitor(self, generator: CodeGenerator):
        """Scenario 1: LLM agent that monitors GitHub PRs."""
        result = generator.generate_from_template(
            agent_type=AgentType.LLM,
            description="Monitors GitHub repos for stale pull requests",
            system_prompt=(
                "You monitor GitHub repositories for pull requests "
                "that haven't been updated within a configurable threshold."
            ),
            services=["github"],
            input_fields={
                "repoOwner": "Owner of the GitHub repository",
                "repoName": "Name of the GitHub repository",
                "staleDays": "Number of days before a PR is considered stale",
            },
            output_fields={
                "stalePRs": "List of stale pull requests",
                "totalCount": "Total number of stale PRs found",
            },
        )

        assert isinstance(result, GeneratedAgent)
        assert result.agent_type == AgentType.LLM
        assert "llmAgent(" in result.code
        assert "@guildai/agents-sdk" in result.code
        assert "zod" in result.code
        assert "@guildai-services/guildai~github" in result.code
        assert "InputSchema" in result.code
        assert "OutputSchema" in result.code
        assert "repoOwner" in result.code
        assert "export default" in result.code

        # Validate the generated code
        errors = generator.validate(result.code)
        assert errors == [], f"Validation errors: {errors}"

    def test_coded_agent_slack_poster(self, generator: CodeGenerator):
        """Scenario 2: Coded agent that posts to Slack."""
        result = generator.generate_from_template(
            agent_type=AgentType.CODED,
            description="Posts formatted messages to Slack channels",
            services=["slack"],
            input_fields={
                "channel": "Slack channel to post to",
                "message": "Message content",
            },
            output_fields={
                "success": "Boolean flag indicating success",
                "messageId": "ID of the posted message",
            },
            handler_body=(
                '    const { channel, message } = input\n'
                '    const result = await ctx.tools.slack.postMessage({ channel, text: message })\n'
                '    return { success: true, messageId: result.ts }'
            ),
        )

        assert result.agent_type == AgentType.CODED
        assert "codedAgent(" in result.code
        assert "@guildai-services/guildai~slack" in result.code
        assert "handler:" in result.code

        errors = generator.validate(result.code)
        assert errors == [], f"Validation errors: {errors}"

    def test_llm_agent_jira_triage(self, generator: CodeGenerator):
        """Scenario 3: LLM agent that triages Jira tickets."""
        result = generator.generate_from_template(
            agent_type=AgentType.LLM,
            description="Triages incoming Jira tickets by priority and category",
            system_prompt=(
                "You are a Jira ticket triage agent. Analyze incoming tickets, "
                "determine priority based on keywords and context, assign categories, "
                "and suggest assignees based on team expertise."
            ),
            services=["jira"],
            input_fields={
                "projectKey": "Jira project key",
                "maxTickets": "Maximum number of tickets to triage",
            },
            output_fields={
                "triaged": "List of triaged tickets with assignments",
                "totalTriaged": "Total count of triaged tickets",
            },
            mode="multi-turn",
        )

        assert result.agent_type == AgentType.LLM
        assert "@guildai-services/guildai~jira" in result.code
        assert "multi-turn" in result.code

        errors = generator.validate(result.code)
        assert errors == [], f"Validation errors: {errors}"

    def test_no_services_agent(self, generator: CodeGenerator):
        """Agent with no external services — only guildTools."""
        result = generator.generate_from_template(
            agent_type=AgentType.LLM,
            description="A simple Q&A agent",
            system_prompt="Answer user questions helpfully.",
            input_fields={"question": "The user question"},
            output_fields={"answer": "The response"},
        )

        assert "guildTools" in result.code
        # Should NOT have any service imports
        for pkg in ALLOWED_GUILD_SERVICES.values():
            assert pkg not in result.code

        errors = generator.validate(result.code)
        assert errors == [], f"Validation errors: {errors}"


# ── Validation tests ────────────────────────────────────────────────────


class TestValidation:
    """Test code validation logic."""

    def test_valid_code_passes(self, generator: CodeGenerator):
        """Well-formed code should pass validation."""
        code = '''import { llmAgent, guildTools } from "@guildai/agents-sdk"
import { z } from "zod"

const InputSchema = z.object({ q: z.string() })
const OutputSchema = z.object({ a: z.string() })

export default llmAgent({
  description: "test",
  tools: { ...guildTools },
  systemPrompt: "test",
  mode: "single-turn",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
})
'''
        errors = generator.validate(code)
        assert errors == []

    def test_disallowed_import_rejected(self, generator: CodeGenerator):
        """Code using disallowed imports should fail."""
        code = '''import { llmAgent, guildTools } from "@guildai/agents-sdk"
import { z } from "zod"
import axios from "axios"

const InputSchema = z.object({})
const OutputSchema = z.object({})

export default llmAgent({
  description: "test",
  tools: { ...guildTools },
  systemPrompt: "test",
  mode: "single-turn",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
})
'''
        errors = generator.validate(code)
        assert len(errors) == 1
        assert "axios" in errors[0]

    def test_missing_export_default(self, generator: CodeGenerator):
        """Code without export default should fail."""
        code = '''import { llmAgent, guildTools } from "@guildai/agents-sdk"
import { z } from "zod"

const InputSchema = z.object({})
const OutputSchema = z.object({})

const agent = llmAgent({ description: "test", tools: { ...guildTools }, systemPrompt: "x", mode: "single-turn", inputSchema: InputSchema, outputSchema: OutputSchema })
'''
        errors = generator.validate(code)
        assert any("export default" in e for e in errors)

    def test_missing_zod_import(self, generator: CodeGenerator):
        """Code without zod import should fail."""
        code = '''import { llmAgent, guildTools } from "@guildai/agents-sdk"

const InputSchema = { type: "object" }
const OutputSchema = { type: "object" }

export default llmAgent({
  description: "test",
  tools: { ...guildTools },
  systemPrompt: "test",
  mode: "single-turn",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
})
'''
        errors = generator.validate(code)
        assert any("zod" in e for e in errors)


# ── Helper method tests ─────────────────────────────────────────────────


class TestHelpers:
    """Test utility and helper methods."""

    def test_extract_code_plain(self, generator: CodeGenerator):
        """Plain code should pass through unchanged."""
        code = 'import { llmAgent } from "@guildai/agents-sdk"'
        assert generator._extract_code(code) == code

    def test_extract_code_markdown_fenced(self, generator: CodeGenerator):
        """Markdown-fenced code should be extracted."""
        raw = '```typescript\nimport { llmAgent } from "@guildai/agents-sdk"\n```'
        assert generator._extract_code(raw) == 'import { llmAgent } from "@guildai/agents-sdk"'

    def test_detect_agent_type_llm(self, generator: CodeGenerator):
        assert generator._detect_agent_type("llmAgent({})") == AgentType.LLM

    def test_detect_agent_type_coded(self, generator: CodeGenerator):
        assert generator._detect_agent_type("codedAgent({})") == AgentType.CODED

    def test_detect_services(self, generator: CodeGenerator):
        code = '''
import { gitHubTools } from "@guildai-services/guildai~github"
import { slackTools } from "@guildai-services/guildai~slack"
'''
        services = generator._detect_services(code)
        assert "@guildai-services/guildai~github" in services
        assert "@guildai-services/guildai~slack" in services
        assert len(services) == 2

    def test_build_zod_schema_empty(self):
        schema = CodeGenerator._build_zod_schema("TestSchema", {})
        assert schema == "const TestSchema = z.object({})"

    def test_build_zod_schema_with_fields(self):
        schema = CodeGenerator._build_zod_schema("InputSchema", {
            "name": "User name",
            "age": "Number of years",
            "active": "Boolean flag",
            "tags": "List of tags",
        })
        assert "z.string()" in schema
        assert "z.number()" in schema
        assert "z.boolean()" in schema
        assert "z.array(" in schema


# ── AgentType enum tests ────────────────────────────────────────────────


class TestAgentType:
    def test_values(self):
        assert AgentType.LLM.value == "llmAgent"
        assert AgentType.CODED.value == "codedAgent"

    def test_string_comparison(self):
        assert AgentType.LLM == "llmAgent"
        assert AgentType.CODED == "codedAgent"
