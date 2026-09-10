import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { ChatMessage, SystemHealthResult } from '../shared/types'

export async function askAgent(_message: ChatMessage): Promise<ChatMessage> {
  const transport = new StdioClientTransport({
    command: 'pnpm',
    args: ['exec', 'tsx', 'src/mcp-server/index.ts'],
  })

  const client = new Client({ name: 'task-agent', version: '0.1.0' })
  await client.connect(transport)

  const result = await client.callTool({ name: 'system_health', arguments: {} })
  await client.close()

  const health = result.structuredContent as SystemHealthResult

  return {
    role: 'assistant',
    content: `System health: ${health.status}. ${health.taskCount} task(s) in the database.`,
  }
}
