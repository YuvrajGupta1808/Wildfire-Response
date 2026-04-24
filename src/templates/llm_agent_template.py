"""
Template for Guild.ai llmAgent-based agents.

This template generates prompt-driven agents that use LLM reasoning
with tools for multi-turn conversations.
"""

LLM_AGENT_TEMPLATE = '''import {{ llmAgent, guildTools }} from "@guildai/agents-sdk"
import {{ z }} from "zod"
{service_imports}

{input_schema}

{output_schema}

export default llmAgent({{
  description: {description},
  tools: {{ ...guildTools{tool_spread} }},
  systemPrompt: {system_prompt},
  mode: {mode},
{input_output_config}}})
'''

# Example of a fully rendered llmAgent
LLM_AGENT_EXAMPLE = '''import { llmAgent, guildTools } from "@guildai/agents-sdk"
import { z } from "zod"
import { gitHubTools } from "@guildai-services/guildai~github"

const InputSchema = z.object({
  repoOwner: z.string().describe("GitHub repository owner"),
  repoName: z.string().describe("GitHub repository name"),
  staleDays: z.number().default(7).describe("Days before a PR is considered stale"),
})

const OutputSchema = z.object({
  stalePRs: z.array(z.object({
    number: z.number(),
    title: z.string(),
    author: z.string(),
    daysSinceUpdate: z.number(),
    url: z.string(),
  })).describe("List of stale pull requests"),
  totalCount: z.number().describe("Total number of stale PRs found"),
})

export default llmAgent({
  description: "Monitors a GitHub repository for stale pull requests that haven\\'t been updated within a configurable threshold",
  tools: { ...guildTools, ...gitHubTools },
  systemPrompt: `You are a GitHub PR monitoring agent. Your job is to:
1. Connect to the specified GitHub repository
2. List all open pull requests
3. Identify PRs that haven\\'t been updated in more than the specified number of days
4. Return a structured list of stale PRs with their details

Always be thorough and check both the PR itself and its review activity.
Report the results in a clear, organized format.`,
  mode: "multi-turn",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
})
'''
