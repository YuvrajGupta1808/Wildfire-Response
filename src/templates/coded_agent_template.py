"""
Template for Guild.ai codedAgent-based agents.

Coded agents are deterministic TypeScript workflows — they don't use
an LLM for reasoning but run step-by-step code. Useful for structured
data processing, transformations, and integrations.
"""

CODED_AGENT_TEMPLATE = '''import {{ codedAgent, guildTools }} from "@guildai/agents-sdk"
import {{ z }} from "zod"
{service_imports}

{input_schema}

{output_schema}

export default codedAgent({{
  description: {description},
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async (input, ctx) => {{
{handler_body}
  }},
}})
'''

# Example of a fully rendered codedAgent
CODED_AGENT_EXAMPLE = '''import { codedAgent, guildTools } from "@guildai/agents-sdk"
import { z } from "zod"
import { slackTools } from "@guildai-services/guildai~slack"

const InputSchema = z.object({
  channel: z.string().describe("Slack channel to post to"),
  message: z.string().describe("Message content to post"),
  mentions: z.array(z.string()).optional().describe("User IDs to mention"),
})

const OutputSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  timestamp: z.string(),
  error: z.string().optional(),
})

export default codedAgent({
  description: "Posts formatted messages to Slack channels with optional user mentions",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async (input, ctx) => {
    const { channel, message, mentions } = input

    let formattedMessage = message
    if (mentions && mentions.length > 0) {
      const mentionStr = mentions.map(id => `<@${id}>`).join(" ")
      formattedMessage = `${mentionStr} ${message}`
    }

    try {
      const result = await ctx.tools.slack.postMessage({
        channel,
        text: formattedMessage,
      })

      return {
        success: true,
        messageId: result.ts,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
})
'''
