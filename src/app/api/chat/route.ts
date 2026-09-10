import { askAgent } from '../../../agent'
import type { ChatMessage } from '../../../shared/types'

export async function POST(request: Request) {
  const message: ChatMessage = await request.json()
  const response = await askAgent(message)
  return Response.json(response)
}
