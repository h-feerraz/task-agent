import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { z } from 'zod'
import type { CreateTaskResult, SystemHealthResult } from '../shared/types'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const server = new McpServer({
  name: 'task-agent-mcp-server',
  version: '0.1.0',
})

server.registerTool(
  'system_health',
  {
    title: 'System Health',
    description:
      'Checks the connection to Postgres and returns the current task count',
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
      const result: SystemHealthResult = {
        status: 'error',
        taskCount: 0,
        timestamp: new Date().toISOString(),
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
        isError: true,
      }
    }
  },
)

const taskOutputShape = {
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']),
  dueDate: z.string().nullable(),
}

server.registerTool(
  'create_task',
  {
    title: 'Create Task',
    description: 'Creates a new task and persists it to Postgres',
    inputSchema: {
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
      dueDate: z.string().optional(),
    },
    outputSchema: {
      status: z.enum(['ok', 'error']),
      task: z.object(taskOutputShape).optional(),
      message: z.string().optional(),
    },
  },
  async ({ title, description, priority, dueDate }) => {
    try {
      const task = await prisma.task.create({
        data: {
          title,
          userId: process.env.DEFAULT_USER_ID,
          ...(description !== undefined && { description }),
          ...(priority !== undefined && { priority }),
          ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        },
      })

      const result: CreateTaskResult = {
        status: 'ok',
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        },
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      console.error(error)
      const result: CreateTaskResult = { status: 'error', message: 'Failed to create task' }
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
