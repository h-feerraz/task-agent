import { askAgent } from '../../../agent'
import type { ChatMessage } from '../../../shared/types'

export async function POST(request: Request) {
  const messages: ChatMessage[] = await request.json()
  const response = await askAgent(messages)
  return Response.json(response)
}
