import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { createTask, deleteTask, getSystemHealth, listTasks, searchTasks, updateTask } from './tools'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required to run the MCP tool tests')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

// Each test run uses its own random userId so it never reads or clobbers real
// dev data, and different test files (or repeated runs) never collide.
const userId = `test-user-${randomUUID()}`
const otherUserId = `test-user-${randomUUID()}`

afterAll(async () => {
  await prisma.task.deleteMany({ where: { userId: { in: [userId, otherUserId] } } })
  await prisma.$disconnect()
})

describe('system_health', () => {
  it('returns ok with a numeric task count', async () => {
    const result = await getSystemHealth(prisma)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(typeof result.taskCount).toBe('number')
      expect(result.taskCount).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('create_task', () => {
  it('creates a task with only the required title, applying schema defaults', async () => {
    const result = await createTask(prisma, userId, { title: 'Only a title' })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.task.title).toBe('Only a title')
      expect(result.task.priority).toBe('MEDIUM')
      expect(result.task.status).toBe('PENDING')
      expect(result.task.description).toBeNull()
      expect(result.task.dueDate).toBeNull()
    }
  })

  it('creates a task with all fields provided', async () => {
    const result = await createTask(prisma, userId, {
      title: 'Full task',
      description: 'Some details',
      priority: 'HIGH',
      dueDate: '2026-12-31',
    })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.task.description).toBe('Some details')
      expect(result.task.priority).toBe('HIGH')
      expect(result.task.dueDate).toBe(new Date('2026-12-31').toISOString())
    }
  })
})

describe('list_tasks', () => {
  beforeEach(async () => {
    await prisma.task.deleteMany({ where: { userId } })
    await prisma.task.create({ data: { title: 'Pending low', userId, status: 'PENDING', priority: 'LOW' } })
    await prisma.task.create({ data: { title: 'Done high', userId, status: 'DONE', priority: 'HIGH' } })
    await prisma.task.create({ data: { title: 'Other user task', userId: otherUserId } })
  })

  it('returns only the calling user\'s tasks when no filter is given', async () => {
    const result = await listTasks(prisma, userId, {})
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.tasks).toHaveLength(2)
      expect(result.tasks.every((task) => task.title !== 'Other user task')).toBe(true)
    }
  })

  it('filters by status', async () => {
    const result = await listTasks(prisma, userId, { status: 'DONE' })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0]?.title).toBe('Done high')
    }
  })

  it('filters by priority', async () => {
    const result = await listTasks(prisma, userId, { priority: 'LOW' })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0]?.title).toBe('Pending low')
    }
  })
})

describe('search_tasks', () => {
  beforeEach(async () => {
    await prisma.task.deleteMany({ where: { userId } })
    await prisma.task.create({ data: { title: 'Prepare demo', userId, description: null } })
    await prisma.task.create({ data: { title: 'Buy milk', userId, description: 'stop by the DEMO store' } })
  })

  it('matches by title, case-insensitively', async () => {
    const result = await searchTasks(prisma, userId, { term: 'demo' })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.tasks.map((task) => task.title).sort()).toEqual(['Buy milk', 'Prepare demo'])
    }
  })

  it('returns an empty list when nothing matches', async () => {
    const result = await searchTasks(prisma, userId, { term: 'nonexistent-term' })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.tasks).toHaveLength(0)
    }
  })
})

describe('update_task', () => {
  it('updates only the given fields, preserving the rest', async () => {
    const created = await prisma.task.create({
      data: { title: 'Original', userId, priority: 'LOW', status: 'PENDING' },
    })

    const result = await updateTask(prisma, userId, { id: created.id, status: 'DONE' })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.task.status).toBe('DONE')
      expect(result.task.title).toBe('Original')
      expect(result.task.priority).toBe('LOW')
    }
  })

  it('returns an error for an unknown id', async () => {
    const result = await updateTask(prisma, userId, { id: 'does-not-exist', status: 'DONE' })
    expect(result).toEqual({ status: 'error', message: 'Task not found' })
  })

  it('returns an error when the task belongs to another user', async () => {
    const created = await prisma.task.create({ data: { title: 'Not yours', userId: otherUserId } })
    const result = await updateTask(prisma, userId, { id: created.id, status: 'DONE' })
    expect(result).toEqual({ status: 'error', message: 'Task not found' })
  })
})

describe('delete_task', () => {
  it('removes the task and returns it', async () => {
    const created = await prisma.task.create({ data: { title: 'To delete', userId } })

    const result = await deleteTask(prisma, userId, { id: created.id })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.task.title).toBe('To delete')
    }

    const stillThere = await prisma.task.findUnique({ where: { id: created.id } })
    expect(stillThere).toBeNull()
  })

  it('returns an error for an unknown id', async () => {
    const result = await deleteTask(prisma, userId, { id: 'does-not-exist' })
    expect(result).toEqual({ status: 'error', message: 'Task not found' })
  })

  it('returns an error when the task belongs to another user', async () => {
    const created = await prisma.task.create({ data: { title: 'Not yours either', userId: otherUserId } })
    const result = await deleteTask(prisma, userId, { id: created.id })
    expect(result).toEqual({ status: 'error', message: 'Task not found' })

    const stillThere = await prisma.task.findUnique({ where: { id: created.id } })
    expect(stillThere).not.toBeNull()
  })
})
