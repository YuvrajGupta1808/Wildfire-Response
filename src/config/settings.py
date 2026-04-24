"""Environment and configuration settings for the agent marketplace."""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    fireworks_api_key: str = ""
    fireworks_model: str = "accounts/fireworks/models/glm-5p1"
    fireworks_base_url: str = "https://api.fireworks.ai/inference/v1"
    # Guild.ai uses browser-based OAuth via `guild auth login` (no API key needed).
    # Auth state is managed by the Guild CLI automatically.

    # WunderGraph Cosmo settings
    cosmo_router_url: str = "http://localhost:3002/graphql"
    cosmo_router_port: int = 3002
    cosmo_infra_dir: str = "infra/cosmo"
    cosmo_subgraphs_base_port: int = 4001

    @classmethod
    def from_env(cls) -> "Settings":
        """Load settings from environment variables (and .env file if present)."""
        env_path = Path(__file__).resolve().parent.parent.parent / ".env"
        load_dotenv(env_path)

        return cls(
            fireworks_api_key=os.getenv("FIREWORKS_API_KEY", ""),
            fireworks_model=os.getenv(
                "FIREWORKS_MODEL", "accounts/fireworks/models/glm-5p1"
            ),
            fireworks_base_url=os.getenv(
                "FIREWORKS_BASE_URL", "https://api.fireworks.ai/inference/v1"
            ),
            cosmo_router_url=os.getenv(
                "COSMO_ROUTER_URL", "http://localhost:3002/graphql"
            ),
            cosmo_router_port=int(os.getenv("COSMO_ROUTER_PORT", "3002")),
            cosmo_infra_dir=os.getenv("COSMO_INFRA_DIR", "infra/cosmo"),
            cosmo_subgraphs_base_port=int(
                os.getenv("COSMO_SUBGRAPHS_BASE_PORT", "4001")
            ),
        )


_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create the singleton settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings.from_env()
    return _settings
