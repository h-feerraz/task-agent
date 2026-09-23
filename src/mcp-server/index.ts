import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { z } from 'zod'
import { createTask, deleteTask, getSystemHealth, listTasks, searchTasks, updateTask } from './tools'

const databaseUrl = process.env.DATABASE_URL
const defaultUserId = process.env.DEFAULT_USER_ID

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}
if (!defaultUserId) {
  throw new Error('DEFAULT_USER_ID environment variable is required')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

const server = new McpServer({
  name: 'task-agent-mcp-server',
  version: '0.1.0',
})

function toMcpResponse<T extends { status: 'ok' | 'error' }>(result: T) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result) }],
    structuredContent: result,
    ...(result.status === 'error' ? { isError: true } : {}),
  }
}

const taskOutputShape = {
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']),
  dueDate: z.string().nullable(),
}

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
  async () => toMcpResponse(await getSystemHealth(prisma)),
)

server.registerTool(
  'create_task',
  {
    title: 'Create Task',
    description: 'Creates a new task and persists it to Postgres',
    inputSchema: {
      title: z.string(),
      description: z.string().nullable().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
      dueDate: z.string().nullable().optional(),
    },
    outputSchema: {
      status: z.enum(['ok', 'error']),
      task: z.object(taskOutputShape).optional(),
      message: z.string().optional(),
    },
  },
  async (input) => toMcpResponse(await createTask(prisma, defaultUserId, input)),
)

server.registerTool(
  'list_tasks',
  {
    title: 'List Tasks',
    description: 'Lists tasks for the user, optionally filtered by status and/or priority',
    inputSchema: {
      status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']).nullable().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
    },
    outputSchema: {
      status: z.enum(['ok', 'error']),
      tasks: z.array(z.object(taskOutputShape)).optional(),
      message: z.string().optional(),
    },
  },
  async (input) => toMcpResponse(await listTasks(prisma, defaultUserId, input)),
)

server.registerTool(
  'search_tasks',
  {
    title: 'Search Tasks',
    description: 'Searches the user tasks for a term in the title or description',
    inputSchema: {
      term: z.string(),
    },
    outputSchema: {
      status: z.enum(['ok', 'error']),
      tasks: z.array(z.object(taskOutputShape)).optional(),
      message: z.string().optional(),
    },
  },
  async (input) => toMcpResponse(await searchTasks(prisma, defaultUserId, input)),
)

server.registerTool(
  'update_task',
  {
    title: 'Update Task',
    description: 'Updates one or more fields of an existing task owned by the user',
    inputSchema: {
      id: z.string(),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']).nullable().optional(),
      dueDate: z.string().nullable().optional(),
    },
    outputSchema: {
      status: z.enum(['ok', 'error']),
      task: z.object(taskOutputShape).optional(),
      message: z.string().optional(),
    },
  },
  async (input) => toMcpResponse(await updateTask(prisma, defaultUserId, input)),
)

server.registerTool(
  'delete_task',
  {
    title: 'Delete Task',
    description: 'Deletes a task owned by the user by id',
    inputSchema: {
      id: z.string(),
    },
    outputSchema: {
      status: z.enum(['ok', 'error']),
      task: z.object(taskOutputShape).optional(),
      message: z.string().optional(),
    },
  },
  async (input) => toMcpResponse(await deleteTask(prisma, defaultUserId, input)),
)

const transport = new StdioServerTransport()
await server.connect(transport)
