"""
Test configuration and mocks.

Provides a mock for the `deepagents` package so tests can run
without the actual dependency installed.
"""

import sys
import types
from unittest.mock import MagicMock

# Create a mock deepagents module so imports don't fail
deepagents_mock = types.ModuleType("deepagents")
deepagents_mock.create_deep_agent = MagicMock()
sys.modules["deepagents"] = deepagents_mock
