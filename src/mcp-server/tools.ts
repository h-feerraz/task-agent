import type { PrismaClient } from '../generated/prisma/client'
import type { Task } from '../generated/prisma/client'
import type {
  CreateTaskResult,
  DeleteTaskResult,
  ListTasksResult,
  SearchTasksResult,
  SystemHealthResult,
  TaskDTO,
  TaskPriority,
  TaskStatus,
  UpdateTaskResult,
} from '../shared/types'

export function toTaskDTO(task: Task): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
  }
}

export async function getSystemHealth(prisma: PrismaClient): Promise<SystemHealthResult> {
  try {
    const taskCount = await prisma.task.count()
    return { status: 'ok', taskCount, timestamp: new Date().toISOString() }
  } catch (error) {
    console.error(error)
    return { status: 'error', taskCount: 0, timestamp: new Date().toISOString() }
  }
}

export type CreateTaskInput = {
  title: string
  description?: string | null
  priority?: TaskPriority | null
  dueDate?: string | null
}

export async function createTask(prisma: PrismaClient, userId: string, input: CreateTaskInput): Promise<CreateTaskResult> {
  const { title, description, priority, dueDate } = input
  try {
    const task = await prisma.task.create({
      data: {
        title,
        userId,
        ...(description != null && { description }),
        ...(priority != null && { priority }),
        ...(dueDate != null && { dueDate: new Date(dueDate) }),
      },
    })
    return { status: 'ok', task: toTaskDTO(task) }
  } catch (error) {
    console.error(error)
    return { status: 'error', message: 'Failed to create task' }
  }
}

export type ListTasksInput = {
  status?: TaskStatus | null
  priority?: TaskPriority | null
}

export async function listTasks(prisma: PrismaClient, userId: string, input: ListTasksInput): Promise<ListTasksResult> {
  const { status, priority } = input
  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(status != null && { status }),
        ...(priority != null && { priority }),
      },
    })
    return { status: 'ok', tasks: tasks.map(toTaskDTO) }
  } catch (error) {
    console.error(error)
    return { status: 'error', message: 'Failed to list tasks' }
  }
}

export type SearchTasksInput = {
  term: string
}

export async function searchTasks(prisma: PrismaClient, userId: string, input: SearchTasksInput): Promise<SearchTasksResult> {
  const { term } = input
  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      },
    })
    return { status: 'ok', tasks: tasks.map(toTaskDTO) }
  } catch (error) {
    console.error(error)
    return { status: 'error', message: 'Failed to search tasks' }
  }
}

export type UpdateTaskInput = {
  id: string
  title?: string | null
  description?: string | null
  priority?: TaskPriority | null
  status?: TaskStatus | null
  dueDate?: string | null
}

export async function updateTask(prisma: PrismaClient, userId: string, input: UpdateTaskInput): Promise<UpdateTaskResult> {
  const { id, title, description, priority, status, dueDate } = input
  try {
    const existing = await prisma.task.findFirst({ where: { id, userId } })
    if (!existing) {
      return { status: 'error', message: 'Task not found' }
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
    return { status: 'ok', task: toTaskDTO(task) }
  } catch (error) {
    console.error(error)
    return { status: 'error', message: 'Failed to update task' }
  }
}

export type DeleteTaskInput = {
  id: string
}

export async function deleteTask(prisma: PrismaClient, userId: string, input: DeleteTaskInput): Promise<DeleteTaskResult> {
  const { id } = input
  try {
    const existing = await prisma.task.findFirst({ where: { id, userId } })
    if (!existing) {
      return { status: 'error', message: 'Task not found' }
    }

    const task = await prisma.task.delete({ where: { id } })
    return { status: 'ok', task: toTaskDTO(task) }
  } catch (error) {
    console.error(error)
    return { status: 'error', message: 'Failed to delete task' }
  }
}
