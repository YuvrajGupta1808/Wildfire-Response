"""
Tests for the agent testing, error-correction, and publishing pipeline.

Tests cover:
- Error parsing (TypeScript errors, generic errors, fallback)
- Pipeline run: pass on first try → publish
- Pipeline run: fail then auto-fix succeeds
- Pipeline run: all retries exhausted
- Fix prompt construction
- File writing helper
"""

import asyncio
import subprocess
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.coordinator.agent_pipeline import (
    AgentPipeline,
    GuildTestError,
    PipelineAttempt,
    PipelineResult,
)
from src.coordinator.code_generator import AgentType, CodeGenerator, GeneratedAgent


# ── Fixtures ──────────────────────────────────────────────────────────────


@pytest.fixture
def generator():
    """CodeGenerator with mocked internals."""
    return CodeGenerator(api_key="test-key")


@pytest.fixture
def pipeline(generator):
    """AgentPipeline with default settings."""
    return AgentPipeline(code_generator=generator, max_retries=3)


@pytest.fixture
def sample_agent():
    """A minimal valid GeneratedAgent for testing."""
    return GeneratedAgent(
        code='import { llmAgent, guildTools } from "@guildai/agents-sdk"\n'
             'import { z } from "zod"\n'
             "const InputSchema = z.object({})\n"
             "const OutputSchema = z.object({})\n"
             "export default llmAgent({ description: 'test', tools: { ...guildTools }, "
             "systemPrompt: 'hi', mode: 'single-turn', inputSchema: InputSchema, "
             "outputSchema: OutputSchema })\n",
        agent_type=AgentType.LLM,
        description="Test agent",
    )


# ── Error parsing tests ──────────────────────────────────────────────────


class TestParseTestErrors:
    """Test Guild CLI error output parsing."""

    def test_typescript_error(self):
        output = 'agent.ts(10,5): error TS2345: Argument of type "string" is not assignable'
        errors = AgentPipeline.parse_test_errors(output)
        assert len(errors) == 1
        assert errors[0].line == 10
        assert errors[0].column == 5
        assert errors[0].severity == "error"
        assert "Argument of type" in errors[0].message

    def test_typescript_warning(self):
        output = "agent.ts(3,1): warning TS6133: Variable is declared but never used"
        errors = AgentPipeline.parse_test_errors(output)
        assert len(errors) == 1
        assert errors[0].severity == "warning"

    def test_generic_error(self):
        output = "Error: Module not found: @guildai/agents-sdk"
        errors = AgentPipeline.parse_test_errors(output)
        assert len(errors) == 1
        assert "Module not found" in errors[0].message

    def test_test_failed_marker(self):
        output = "✗ Test failed: agent did not produce expected output"
        errors = AgentPipeline.parse_test_errors(output)
        assert len(errors) == 1
        assert "agent did not produce expected output" in errors[0].message

    def test_fallback_error_keyword(self):
        output = "Some unexpected error occurred in compilation"
        errors = AgentPipeline.parse_test_errors(output)
        assert len(errors) == 1
        assert "error" in errors[0].message.lower()

    def test_empty_output(self):
        assert AgentPipeline.parse_test_errors("") == []
        assert AgentPipeline.parse_test_errors("\n\n\n") == []

    def test_no_errors(self):
        output = "✓ All tests passed\nAgent validated successfully"
        errors = AgentPipeline.parse_test_errors(output)
        assert len(errors) == 0

    def test_multiple_errors(self):
        output = (
            'agent.ts(1,1): error TS1234: Missing import\n'
            'agent.ts(5,10): error TS5678: Type mismatch\n'
            'Error: Build failed with 2 errors\n'
        )
        errors = AgentPipeline.parse_test_errors(output)
        # 2 TS errors + 1 generic "Error:" + the "2 errors" fallback
        # Actually "Error: Build failed with 2 errors" matches generic AND fallback
        # but `continue` after generic means it won't hit fallback
        assert len(errors) == 3


# ── Fix prompt tests ─────────────────────────────────────────────────────


class TestBuildFixPrompt:
    def test_includes_errors_and_code(self):
        errors = [
            GuildTestError(line=10, message="Missing import"),
            GuildTestError(message="Build failed"),
        ]
        prompt = AgentPipeline._build_fix_prompt("const x = 1", errors)
        assert "Line 10: Missing import" in prompt
        assert "Build failed" in prompt
        assert "const x = 1" in prompt
        assert "Fix ALL errors" in prompt




# ── Pipeline run tests ───────────────────────────────────────────────────


def _make_completed_process(returncode=0, stdout="", stderr=""):
    """Helper to create a subprocess.CompletedProcess."""
    return subprocess.CompletedProcess(
        args=["guild"], returncode=returncode, stdout=stdout, stderr=stderr,
    )


class TestPipelineRun:
    """Test the full pipeline run method."""

    def test_pass_on_first_try(self, pipeline, sample_agent):
        """Agent passes tests on first attempt → publish."""
        with patch.object(
            pipeline, "_run_guild_test",
            return_value=_make_completed_process(0, "✓ All tests passed"),
        ), patch.object(
            pipeline, "_run_guild_publish",
            return_value=_make_completed_process(0, "Published successfully"),
        ):
            result = asyncio.run(pipeline.run(sample_agent))

        assert result.success is True
        assert result.published is True
        assert len(result.attempts) == 1
        assert result.attempts[0].test_passed is True

    def test_fail_then_fix_succeeds(self, pipeline, sample_agent):
        """Agent fails first, auto-fix succeeds on second try."""
        fail_proc = _make_completed_process(1, "", "agent.ts(1,1): error TS1234: Bad import")
        pass_proc = _make_completed_process(0, "✓ All tests passed")
        pub_proc = _make_completed_process(0, "Published")

        call_count = 0

        def mock_test(agent_dir):
            nonlocal call_count
            call_count += 1
            return fail_proc if call_count == 1 else pass_proc

        fixed_agent = GeneratedAgent(
            code="// fixed code\n" + sample_agent.code,
            agent_type=AgentType.LLM,
            description="Fixed",
        )

        with patch.object(pipeline, "_run_guild_test", side_effect=mock_test), \
             patch.object(pipeline, "_run_guild_publish", return_value=pub_proc), \
             patch.object(
                 pipeline.code_generator, "generate",
                 new_callable=AsyncMock, return_value=fixed_agent,
             ):
            result = asyncio.run(pipeline.run(sample_agent))

        assert result.success is True
        assert result.published is True
        assert len(result.attempts) == 2
        assert result.attempts[0].test_passed is False
        assert result.attempts[1].test_passed is True

    def test_all_retries_exhausted(self, pipeline, sample_agent):
        """Agent fails all retries → not published."""
        fail_proc = _make_completed_process(1, "", "Error: something broke")

        fixed_agent = GeneratedAgent(
            code="// still broken\n" + sample_agent.code,
            agent_type=AgentType.LLM,
            description="Still broken",
        )

        with patch.object(pipeline, "_run_guild_test", return_value=fail_proc), \
             patch.object(
                 pipeline.code_generator, "generate",
                 new_callable=AsyncMock, return_value=fixed_agent,
             ):
            result = asyncio.run(pipeline.run(sample_agent))

        assert result.success is False
        assert result.published is False
        assert len(result.attempts) == 3  # max_retries=3

    def test_auto_fix_exception_handled(self, pipeline, sample_agent):
        """If auto-fix raises, pipeline continues without crashing."""
        pipeline.max_retries = 2
        fail_proc = _make_completed_process(1, "", "Error: broken")

        with patch.object(pipeline, "_run_guild_test", return_value=fail_proc), \
             patch.object(
                 pipeline.code_generator, "generate",
                 new_callable=AsyncMock, side_effect=RuntimeError("LLM down"),
             ):
            result = asyncio.run(pipeline.run(sample_agent))

        assert result.success is False
        assert len(result.attempts) == 2

    def test_publish_failure_reported(self, pipeline, sample_agent):
        """Tests pass but publish fails → success=True, published=False."""
        with patch.object(
            pipeline, "_run_guild_test",
            return_value=_make_completed_process(0, "✓ passed"),
        ), patch.object(
            pipeline, "_run_guild_publish",
            return_value=_make_completed_process(1, "", "Error: auth failed"),
        ):
            result = asyncio.run(pipeline.run(sample_agent))

        assert result.success is True
        assert result.published is False
        assert "auth failed" in result.publish_output

    def test_configurable_max_retries(self, generator, sample_agent):
        """max_retries=1 means only one attempt."""
        pipeline = AgentPipeline(code_generator=generator, max_retries=1)
        fail_proc = _make_completed_process(1, "", "Error: fail")

        with patch.object(pipeline, "_run_guild_test", return_value=fail_proc):
            result = asyncio.run(pipeline.run(sample_agent))

        assert result.success is False
        assert len(result.attempts) == 1

# ── File writing test ────────────────────────────────────────────────────


class TestWriteAgentFile:
    def test_writes_agent_ts(self, tmp_path):
        code = "export default llmAgent({})"
        path = AgentPipeline._write_agent_file(str(tmp_path), code)
        assert path.endswith("agent.ts")
        assert (tmp_path / "agent.ts").read_text() == code
