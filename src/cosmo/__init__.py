"""WunderGraph Cosmo integration for agent API federation.

Provides:
- SubgraphSchemaGenerator: Generate GraphQL subgraph schemas from agent metadata
- SubgraphRegistry: Register/publish subgraphs with Cosmo
"""

from src.cosmo.schema_generator import SubgraphSchemaGenerator
from src.cosmo.subgraph_registry import SubgraphRegistry

__all__ = ["SubgraphSchemaGenerator", "SubgraphRegistry"]
