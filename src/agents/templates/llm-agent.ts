/**
 * LLM Agent Template for Guild.ai
 *
 * This is a base template that the Coordinator uses to generate
 * prompt-driven agents with tools and multi-turn conversation support.
 *
 * Note: @guildai/agents-sdk is not installed locally — this template
 * is used for code generation and runs in Guild's sandboxed environment.
 */

// Template placeholder — the Coordinator will generate actual agent code
// based on user requests, replacing this with specific configurations.

export const LLM_AGENT_TEMPLATE = `
import { llmAgent, guildTools } from "@guildai/agents-sdk";

export default llmAgent({
  description: "{{AGENT_DESCRIPTION}}",
  tools: { ...guildTools },
  systemPrompt: \`{{SYSTEM_PROMPT}}\`,
  mode: "multi-turn",
});
`;

export const CODED_AGENT_TEMPLATE = `
import { codedAgent, guildTools } from "@guildai/agents-sdk";

export default codedAgent({
  description: "{{AGENT_DESCRIPTION}}",
  tools: { ...guildTools },
  run: async (ctx) => {
    // {{AGENT_LOGIC}}
  },
});
`;
