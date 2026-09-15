import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { z } from 'zod'
import type { SystemHealthResult } from '../shared/types'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const server = new McpServer({ name: 'task-agent-mcp-server', version: '0.1.0' })

server.registerTool(
  'system_health',
  {
    title: 'System Health',
    description: 'Checks the connection to Postgres and returns the current task count',
    inputSchema: {},
    outputSchema: {
      status: z.enum(['ok', 'error']),
      taskCount: z.number(),
      timestamp: z.string(),
    },
  },
  async () => {
    try {
      const taskCount = await prisma.task.count()
      const result: SystemHealthResult = {
        status: 'ok',
        taskCount,
        timestamp: new Date().toISOString(),
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      console.error(error)
      const result: SystemHealthResult = { status: 'error', taskCount: 0, timestamp: new Date().toISOString() }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
        isError: true,
      }
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
