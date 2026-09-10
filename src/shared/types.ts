export type SystemHealthResult = {
  status: 'ok' | 'error'
  taskCount: number
  timestamp: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
