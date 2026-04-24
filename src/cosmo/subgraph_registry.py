"""Subgraph Registry — manages subgraph registration with WunderGraph Cosmo.

Handles:
- Writing subgraph SDL to the compose config
- Invoking `wgc subgraph publish` / `wgc router compose`
- Tracking registered subgraphs
"""

from __future__ import annotations

import json
import logging
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from src.cosmo.schema_generator import SubgraphSchema

logger = logging.getLogger(__name__)

# Default paths relative to project root
DEFAULT_INFRA_DIR = Path("infra/cosmo")
DEFAULT_COMPOSE_CONFIG = DEFAULT_INFRA_DIR / "compose.yaml"
DEFAULT_SUBGRAPHS_DIR = DEFAULT_INFRA_DIR / "subgraphs"


@dataclass
class RegisteredSubgraph:
    """A subgraph that has been registered with Cosmo."""
    name: str
    routing_url: str
    schema_path: str
    agent_id: str


@dataclass
class SubgraphRegistry:
    """Manages subgraph lifecycle with WunderGraph Cosmo.

    Usage:
        registry = SubgraphRegistry(project_root=Path("."))
        schema = schema_gen.generate(...)
        registry.register(schema, routing_url="http://localhost:4003/graphql")
        registry.compose()  # Rebuild the supergraph config
    """

    project_root: Path = field(default_factory=lambda: Path("."))
    registered: dict[str, RegisteredSubgraph] = field(default_factory=dict)

    @property
    def infra_dir(self) -> Path:
        return self.project_root / DEFAULT_INFRA_DIR

    @property
    def subgraphs_dir(self) -> Path:
        return self.project_root / DEFAULT_SUBGRAPHS_DIR

    @property
    def compose_config(self) -> Path:
        return self.project_root / DEFAULT_COMPOSE_CONFIG

    def register(
        self,
        schema: SubgraphSchema,
        routing_url: str,
        port: int = 4003,
    ) -> RegisteredSubgraph:
        """Register a new subgraph by writing its schema and updating compose config.

        Args:
            schema: Generated subgraph schema.
            routing_url: URL where the subgraph server will be reachable.
            port: Port for the subgraph server (used in docker networking).

        Returns:
            RegisteredSubgraph record.
        """
        subgraph_dir = self.subgraphs_dir / schema.subgraph_name
        subgraph_dir.mkdir(parents=True, exist_ok=True)

        # Write the SDL file
        schema_path = subgraph_dir / "schema.graphql"
        schema_path.write_text(schema.sdl, encoding="utf-8")
        logger.info("Wrote subgraph schema to %s", schema_path)

        # Update compose.yaml to include the new subgraph
        self._add_to_compose_config(
            schema.subgraph_name,
            routing_url,
            str(schema_path.relative_to(self.project_root / DEFAULT_INFRA_DIR)),
        )

        registered = RegisteredSubgraph(
            name=schema.subgraph_name,
            routing_url=routing_url,
            schema_path=str(schema_path),
            agent_id=schema.agent_id,
        )
        self.registered[schema.subgraph_name] = registered
        logger.info("Registered subgraph '%s' for agent '%s'", schema.subgraph_name, schema.agent_id)
        return registered

    def _add_to_compose_config(
        self, name: str, routing_url: str, schema_file: str
    ) -> None:
        """Append a subgraph entry to compose.yaml if not already present."""
        config_path = self.compose_config
        content = config_path.read_text(encoding="utf-8") if config_path.exists() else ""

        if f"name: {name}" in content:
            logger.info("Subgraph '%s' already in compose config, skipping", name)
            return

        entry = (
            f"\n  - name: {name}\n"
            f"    routing_url: {routing_url}\n"
            f"    schema:\n"
            f"      file: ./{schema_file}\n"
        )
        # Append under subgraphs section
        if "subgraphs:" in content:
            content = content.rstrip() + entry
        else:
            content += f"\nsubgraphs:{entry}"

        config_path.write_text(content, encoding="utf-8")
        logger.info("Added '%s' to compose config", name)

    def compose(self, output_path: Optional[str] = None) -> str:
        """Run `wgc router compose` to build the supergraph config.

        Args:
            output_path: Where to write config.json. Defaults to infra/cosmo/config.json.

        Returns:
            Path to the generated config file.
        """
        out = output_path or str(self.infra_dir / "config.json")
        cmd = [
            "npx", "wgc@latest", "router", "compose",
            "--input", str(self.compose_config),
            "--out", out,
        ]
        logger.info("Composing supergraph: %s", " ".join(cmd))
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, cwd=str(self.project_root),
                timeout=60,
            )
            if result.returncode != 0:
                logger.error("wgc compose failed: %s", result.stderr)
                raise RuntimeError(f"wgc router compose failed:\n{result.stderr}")
            logger.info("Supergraph config written to %s", out)
        except FileNotFoundError:
            logger.warning(
                "wgc CLI not found. Install with: npm install -g wgc@latest\n"
                "Skipping composition — schemas are written and ready for manual compose."
            )
        return out

    def publish(
        self,
        subgraph_name: str,
        namespace: str = "default",
        graph_name: str = "agent-marketplace",
    ) -> bool:
        """Publish a subgraph to Cosmo controlplane (when available).

        For local dev, composition via `wgc router compose` is preferred.
        This method is for when a Cosmo controlplane is running.

        Args:
            subgraph_name: Name of the subgraph to publish.
            namespace: Cosmo namespace.
            graph_name: Federated graph name.

        Returns:
            True if publish succeeded, False otherwise.
        """
        if subgraph_name not in self.registered:
            raise ValueError(f"Subgraph '{subgraph_name}' not registered")

        sub = self.registered[subgraph_name]
        cmd = [
            "npx", "wgc@latest", "subgraph", "publish", subgraph_name,
            "--namespace", namespace,
            "--schema", sub.schema_path,
            "--routing-url", sub.routing_url,
        ]
        logger.info("Publishing subgraph: %s", " ".join(cmd))
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, cwd=str(self.project_root),
                timeout=60,
            )
            if result.returncode != 0:
                logger.error("wgc publish failed: %s", result.stderr)
                return False
            logger.info("Subgraph '%s' published successfully", subgraph_name)
            return True
        except FileNotFoundError:
            logger.warning("wgc CLI not found — skipping publish")
            return False

    def list_subgraphs(self) -> list[RegisteredSubgraph]:
        """Return all registered subgraphs."""
        return list(self.registered.values())
