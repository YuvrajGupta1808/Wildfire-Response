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
    guild_api_key: str = ""

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
            guild_api_key=os.getenv("GUILD_API_KEY", ""),
        )


_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create the singleton settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings.from_env()
    return _settings
