import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { z } from 'zod'
import type {
  CreateTaskResult,
  DeleteTaskResult,
  ListTasksResult,
  SearchTasksResult,
  SystemHealthResult,
  UpdateTaskResult,
} from '../shared/types'

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
  async ({ title, description, priority, dueDate }) => {
    try {
      const task = await prisma.task.create({
        data: {
          title,
          userId: process.env.DEFAULT_USER_ID,
          ...(description != null && { description }),
          ...(priority != null && { priority }),
          ...(dueDate != null && { dueDate: new Date(dueDate) }),
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
  async ({ status, priority }) => {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          userId: process.env.DEFAULT_USER_ID,
          ...(status != null && { status }),
          ...(priority != null && { priority }),
        },
      })

      const result: ListTasksResult = {
        status: 'ok',
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        })),
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      console.error(error)
      const result: ListTasksResult = { status: 'error', message: 'Failed to list tasks' }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
        isError: true,
      }
    }
  },
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
  async ({ term }) => {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          userId: process.env.DEFAULT_USER_ID,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
      })

      const result: SearchTasksResult = {
        status: 'ok',
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        })),
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      console.error(error)
      const result: SearchTasksResult = { status: 'error', message: 'Failed to search tasks' }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
        isError: true,
      }
    }
  },
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
  async ({ id, title, description, priority, status, dueDate }) => {
    try {
      const existing = await prisma.task.findFirst({
        where: { id, userId: process.env.DEFAULT_USER_ID },
      })

      if (!existing) {
        const result: UpdateTaskResult = { status: 'error', message: 'Task not found' }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: true,
        }
      }

      const task = await prisma.task.update({
        where: { id },
        data: {
          ...(title != null && { title }),
          ...(description != null && { description }),
          ...(priority != null && { priority }),
          ...(status != null && { status }),
          ...(dueDate != null && { dueDate: new Date(dueDate) }),
        },
      })

      const result: UpdateTaskResult = {
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
      const result: UpdateTaskResult = { status: 'error', message: 'Failed to update task' }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
        isError: true,
      }
    }
  },
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
  async ({ id }) => {
    try {
      const existing = await prisma.task.findFirst({
        where: { id, userId: process.env.DEFAULT_USER_ID },
      })

      if (!existing) {
        const result: DeleteTaskResult = { status: 'error', message: 'Task not found' }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: true,
        }
      }

      const task = await prisma.task.delete({ where: { id } })

      const result: DeleteTaskResult = {
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
      const result: DeleteTaskResult = { status: 'error', message: 'Failed to delete task' }
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
