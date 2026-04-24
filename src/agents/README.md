# Guild.ai Agent Templates

This directory contains TypeScript agent templates for the Guild.ai runtime.

## Structure

- `templates/` — Base agent templates (LLM agent, coded agent, etc.)
- Generated agents will be placed in subdirectories here

## Constraints

Guild agents run in a sandboxed environment. Only these packages are allowed:
- `@guildai/agents-sdk`
- `zod`
- `@guildai-services/*` (Guild integration packages)
