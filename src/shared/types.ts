export type SystemHealthResult = {
  status: 'ok' | 'error'
  taskCount: number
  timestamp: string
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'

export type TaskDTO = {
  id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
}

export type CreateTaskResult = { status: 'ok'; task: TaskDTO } | { status: 'error'; message: string }

export type ListTasksResult = { status: 'ok'; tasks: TaskDTO[] } | { status: 'error'; message: string }

export type SearchTasksResult = { status: 'ok'; tasks: TaskDTO[] } | { status: 'error'; message: string }

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
