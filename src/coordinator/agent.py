"""Coordinator agent setup using Deep Agents + Fireworks GLM-5.1."""

from deepagents import create_deep_agent

from src.config.settings import get_settings

COORDINATOR_SYSTEM_PROMPT = """\
You are the Coordinator Agent for an agent marketplace platform.

Your responsibilities:
1. Receive user requests for new agents
2. Design the agent architecture (LLM vs coded, tools needed, schemas)
3. Write Guild.ai agent code (TypeScript) using the Guild SDK
4. Test agents using `guild agent test --ephemeral`
5. On failure: read errors, fix code, and retest (up to 3 retries)
6. Publish working agents via `guild agent save --publish`
7. Register agent subgraphs in WunderGraph Cosmo
8. Store agent metadata and context in Ghost (ghost.build)

You use the Guild.ai agents SDK (@guildai/agents-sdk) and only approved packages.
You generate TypeScript agent code that runs in Guild's sandboxed environment.
"""


def create_coordinator():
    """Create and return the coordinator Deep Agent with Fireworks GLM-5.1.

    Tools will be added in later tasks (Guild CLI, Cosmo, Ghost).
    """
    settings = get_settings()

    model_id = f"fireworks:{settings.fireworks_model}"

    coordinator = create_deep_agent(
        model=model_id,
        tools=[],  # Tools will be added in later tasks
        system_prompt=COORDINATOR_SYSTEM_PROMPT,
    )

    return coordinator
