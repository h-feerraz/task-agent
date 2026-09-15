'use client'

import { useState } from 'react'
import type { ChatMessage } from '../shared/types'

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const userMessage: ChatMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userMessage),
    })
    const assistantMessage: ChatMessage = await res.json()
    setMessages((prev) => [...prev, assistantMessage])
  }

  return (
    <main>
      <div>
        {messages.map((message, index) => (
          <p key={index}>
            <strong>{message.role}:</strong> {message.content}
          </p>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Digite uma mensagem..." />
        <button type="submit">Enviar</button>
      </form>
    </main>
  )
}
