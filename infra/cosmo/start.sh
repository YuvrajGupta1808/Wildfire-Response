#!/usr/bin/env bash
# Start WunderGraph Cosmo locally for agent API federation
#
# Prerequisites:
#   - Docker Desktop running (4+ CPUs, 8GB+ RAM)
#   - Node.js 18+ (for wgc CLI)
#
# Usage:
#   cd infra/cosmo && ./start.sh
#
# This script:
#   1. Composes the supergraph from subgraph schemas
#   2. Starts the Router + mock subgraph servers via docker-compose

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== WunderGraph Cosmo Local Setup ==="

# Step 1: Compose the supergraph
echo ""
echo "→ Composing supergraph from subgraph schemas..."
if command -v npx &> /dev/null; then
  npx wgc@latest router compose --input compose.yaml --out config.json
  echo "  ✓ Supergraph config written to config.json"
else
  echo "  ⚠ npx not found — skipping composition."
  echo "  Install Node.js 18+ and run:"
  echo "    npx wgc@latest router compose --input compose.yaml --out config.json"
  if [ ! -f config.json ]; then
    echo '{}' > config.json
    echo "  Created placeholder config.json"
  fi
fi

# Step 2: Start services
echo ""
echo "→ Starting Cosmo Router + mock subgraphs..."
docker compose up -d

echo ""
echo "=== Cosmo is running! ==="
echo "  GraphQL Playground: http://localhost:3002/graphql"
echo "  Health check:       http://localhost:3002/health"
echo "  Marketplace API:    http://localhost:4001/graphql"
echo "  Execution API:      http://localhost:4002/graphql"
echo ""
echo "Try a federated query:"
echo '  curl -X POST http://localhost:3002/graphql \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"query": "{ availableAgents { id name description } }"}'\'
echo ""
echo "To stop: docker compose down"
