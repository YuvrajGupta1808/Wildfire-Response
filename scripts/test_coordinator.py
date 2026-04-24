#!/usr/bin/env python3
"""Test script to verify the coordinator agent initializes correctly.

Usage:
    python scripts/test_coordinator.py

This script verifies:
1. deepagents can be imported
2. Settings load correctly
3. The coordinator agent can be created
"""

import sys


def test_imports():
    """Test that required packages can be imported."""
    print("Testing imports...")
    try:
        from deepagents import create_deep_agent
        print("  ✓ deepagents imported successfully")
    except ImportError as e:
        print(f"  ✗ Failed to import deepagents: {e}")
        return False

    try:
        import langchain_fireworks
        print("  ✓ langchain-fireworks imported successfully")
    except ImportError as e:
        print(f"  ✗ Failed to import langchain-fireworks: {e}")
        return False

    return True


def test_settings():
    """Test that settings load correctly."""
    print("\nTesting settings...")
    try:
        from src.config.settings import get_settings
        settings = get_settings()
        print(f"  ✓ Settings loaded")
        print(f"    Model: {settings.fireworks_model}")
        print(f"    Base URL: {settings.fireworks_base_url}")
        print(f"    API Key: {'set' if settings.fireworks_api_key else 'NOT SET'}")
        return True
    except Exception as e:
        print(f"  ✗ Failed to load settings: {e}")
        return False


def test_coordinator_creation():
    """Test that the coordinator agent can be created."""
    print("\nTesting coordinator creation...")
    try:
        from src.coordinator.agent import create_coordinator
        coordinator = create_coordinator()
        print(f"  ✓ Coordinator agent created successfully")
        print(f"    Type: {type(coordinator).__name__}")
        return True
    except Exception as e:
        print(f"  ✗ Failed to create coordinator: {e}")
        return False


def main():
    print("=" * 60)
    print("Coordinator Agent Verification")
    print("=" * 60)

    results = []
    results.append(("Imports", test_imports()))
    results.append(("Settings", test_settings()))
    results.append(("Coordinator", test_coordinator_creation()))

    print("\n" + "=" * 60)
    print("Results:")
    all_passed = True
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {name}")
        if not passed:
            all_passed = False

    print("=" * 60)
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
