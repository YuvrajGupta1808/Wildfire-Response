"""
Agent Testing, Error-Correction, and Publishing Pipeline.

Takes generated Guild.ai agent code, tests it via the Guild CLI,
auto-corrects errors by feeding them back to the CodeGenerator, and
publishes successful agents.
"""

from __future__ import annotations

import asyncio
import logging
import re
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from src.coordinator.code_generator import CodeGenerator, GeneratedAgent

logger = logging.getLogger(__name__)

# ── Data classes ──────────────────────────────────────────────────────────

@dataclass
class GuildTestError:
    """A single parsed error from Guild CLI test output."""
    line: Optional[int] = None
    column: Optional[int] = None
    message: str = ""
    severity: str = "error"  # "error" | "warning"
    raw: str = ""


@dataclass
class PipelineAttempt:
    """Record of a single test-fix attempt."""
    attempt_number: int
    code: str
    test_passed: bool
    errors: list[GuildTestError] = field(default_factory=list)
    raw_output: str = ""


@dataclass
class PipelineResult:
    """Final result of the pipeline run."""
    success: bool
    final_code: str
    published: bool = False
    attempts: list[PipelineAttempt] = field(default_factory=list)
    publish_output: str = ""
    agent_description: str = ""


# ── Pipeline ──────────────────────────────────────────────────────────────

class AgentPipeline:
    """Test → fix → retry → publish pipeline for Guild.ai agents.

    Args:
        code_generator: CodeGenerator instance for fix iterations.
        max_retries: Maximum number of fix-and-retry attempts (default 3).
        guild_cmd: Path/name of the guild CLI binary (default "guild").
        work_dir: Optional working directory for Guild CLI calls.
    """

    def __init__(
        self,
        code_generator: CodeGenerator,
        max_retries: int = 3,
        guild_cmd: str = "guild",
        work_dir: Optional[str] = None,
    ):
        self.code_generator = code_generator
        self.max_retries = max_retries
        self.guild_cmd = guild_cmd
        self.work_dir = work_dir

    # ── Guild CLI wrappers ────────────────────────────────────────────

    def _run_guild_test(self, agent_dir: str) -> subprocess.CompletedProcess:
        """Run ``guild agent test --ephemeral`` on the given agent directory."""
        cmd = [self.guild_cmd, "agent", "test", "--ephemeral", agent_dir]
        logger.info("Running Guild test: %s", " ".join(cmd))
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=self.work_dir,
            timeout=120,
        )

    def _run_guild_publish(self, agent_dir: str) -> subprocess.CompletedProcess:
        """Run ``guild agent save --publish`` on the given agent directory."""
        cmd = [self.guild_cmd, "agent", "save", "--publish", agent_dir]
        logger.info("Running Guild publish: %s", " ".join(cmd))
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=self.work_dir,
            timeout=120,
        )

    # ── Error parsing ─────────────────────────────────────────────────

    @staticmethod
    def parse_test_errors(output: str) -> list[GuildTestError]:
        """Parse Guild CLI test output into structured errors.

        Handles common patterns:
        - ``agent.ts(10,5): error TS2345: ...``
        - ``Error: ...``
        - ``✗ Test failed: ...``
        """
        errors: list[GuildTestError] = []
        for line in output.splitlines():
            stripped = line.strip()
            if not stripped:
                continue

            # TypeScript-style: agent.ts(line,col): error TSxxxx: message
            ts_match = re.match(
                r".*?\((\d+),(\d+)\):\s*(error|warning)\s+\w+:\s*(.+)", stripped
            )
            if ts_match:
                errors.append(GuildTestError(
                    line=int(ts_match.group(1)),
                    column=int(ts_match.group(2)),
                    severity=ts_match.group(3),
                    message=ts_match.group(4).strip(),
                    raw=stripped,
                ))
                continue

            # Generic "Error: ..." lines
            err_match = re.match(r"(?:Error|✗\s*Test failed):\s*(.+)", stripped)
            if err_match:
                errors.append(GuildTestError(
                    message=err_match.group(1).strip(),
                    raw=stripped,
                ))
                continue

            # Lines containing "error" (case-insensitive) as fallback
            if re.search(r"\berror\b", stripped, re.IGNORECASE):
                errors.append(GuildTestError(
                    message=stripped,
                    raw=stripped,
                ))

        return errors

    # ── Helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _write_agent_file(directory: str, code: str) -> str:
        """Write agent.ts into the given directory. Returns the file path."""
        path = Path(directory) / "agent.ts"
        path.write_text(code, encoding="utf-8")
        return str(path)

    # ── Main pipeline ─────────────────────────────────────────────────

    async def run(self, agent: GeneratedAgent) -> PipelineResult:
        """Execute the full test → fix → publish pipeline.

        Args:
            agent: A GeneratedAgent from the CodeGenerator.

        Returns:
            PipelineResult with success status, final code, and attempt log.
        """
        attempts: list[PipelineAttempt] = []
        current_code = agent.code

        for attempt_num in range(1, self.max_retries + 1):
            logger.info(
                "Pipeline attempt %d/%d for agent: %s",
                attempt_num, self.max_retries, agent.description,
            )

            # Write agent code to a temp directory
            with tempfile.TemporaryDirectory(prefix="guild_agent_") as tmpdir:
                self._write_agent_file(tmpdir, current_code)

                # Run tests
                proc = await asyncio.to_thread(self._run_guild_test, tmpdir)

            raw_output = proc.stdout + proc.stderr
            test_passed = proc.returncode == 0

            if test_passed:
                errors: list[GuildTestError] = []
            else:
                errors = self.parse_test_errors(raw_output)

            attempt = PipelineAttempt(
                attempt_number=attempt_num,
                code=current_code,
                test_passed=test_passed,
                errors=errors,
                raw_output=raw_output,
            )
            attempts.append(attempt)

            logger.info(
                "Attempt %d: %s (%d errors)",
                attempt_num,
                "PASSED" if test_passed else "FAILED",
                len(errors),
            )

            if test_passed:
                break

            # If not the last attempt, try to fix
            if attempt_num < self.max_retries:
                logger.info("Attempting auto-fix via CodeGenerator...")
                fix_prompt = self._build_fix_prompt(current_code, errors)
                try:
                    fixed_agent = await self.code_generator.generate(fix_prompt)
                    current_code = fixed_agent.code
                    logger.info("Auto-fix produced new code, retrying...")
                except Exception as fix_err:
                    logger.warning("Auto-fix failed: %s", fix_err)
                    # Keep current code for the next attempt log
            else:
                logger.error(
                    "All %d attempts exhausted. Agent failed to pass tests.",
                    self.max_retries,
                )

        # ── Publish on success ────────────────────────────────────────
        result = PipelineResult(
            success=attempts[-1].test_passed if attempts else False,
            final_code=current_code,
            attempts=attempts,
            agent_description=agent.description,
        )

        if result.success:
            logger.info("Tests passed — publishing agent...")
            with tempfile.TemporaryDirectory(prefix="guild_publish_") as tmpdir:
                self._write_agent_file(tmpdir, current_code)
                pub_proc = await asyncio.to_thread(self._run_guild_publish, tmpdir)
            result.publish_output = pub_proc.stdout + pub_proc.stderr
            result.published = pub_proc.returncode == 0
            if result.published:
                logger.info("Agent published successfully.")
            else:
                logger.warning("Publish failed: %s", result.publish_output)

        # ── Log summary ──────────────────────────────────────────────
        logger.info(
            "Pipeline complete: success=%s, published=%s, attempts=%d",
            result.success, result.published, len(result.attempts),
        )

        return result

    # ── Fix prompt builder ────────────────────────────────────────────

    @staticmethod
    def _build_fix_prompt(code: str, errors: list[GuildTestError]) -> str:
        """Build a prompt asking the LLM to fix the agent code."""
        error_descriptions = "\n".join(
            f"  - Line {e.line}: {e.message}" if e.line else f"  - {e.message}"
            for e in errors
        )
        return (
            "The following Guild.ai agent code has test errors. "
            "Fix ALL errors and return the corrected TypeScript code only.\n\n"
            "## Errors\n"
            f"{error_descriptions}\n\n"
            "## Current Code\n"
            f"```typescript\n{code}\n```\n\n"
            "Return ONLY the fixed TypeScript code. No markdown fences, no explanations."
        )
