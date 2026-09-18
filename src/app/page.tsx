'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Send, User } from 'lucide-react'

import type { ChatMessage } from '@/shared/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/theme-toggle'

type DisplayMessage = ChatMessage & { id: string; timestamp: number }

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar>
        <AvatarFallback>{isUser ? <User className="size-4" /> : <Bot className="size-4" />}</AvatarFallback>
      </Avatar>
      <Card className={`max-w-[75%] px-4 py-2 ${isUser ? 'bg-primary text-primary-foreground' : ''}`}>
        {/* the user bubble's background is always the opposite lightness of the page, so prose inverts the other way */}
        <div
          className={`prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 ${
            isUser ? 'prose-invert dark:prose' : 'dark:prose-invert'
          }`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
        <p className={`mt-1 text-right text-xs ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {formatTime(message.timestamp)}
        </p>
      </Card>
    </div>
  )
}

function LoadingBubble() {
  return (
    <div className="flex items-end gap-2">
      <Avatar>
        <AvatarFallback>
          <Bot className="size-4" />
        </AvatarFallback>
      </Avatar>
      <Card className="flex flex-col gap-2 px-4 py-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
      </Card>
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.trim()) return

    const userMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: userMessage.role, content: userMessage.content }),
      })
      const assistantMessage: ChatMessage = await res.json()
      setMessages((prev) => [
        ...prev,
        { ...assistantMessage, id: crypto.randomUUID(), timestamp: Date.now() },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col p-4">
      <header className="flex items-center justify-between border-b pb-3">
        <h1 className="text-lg font-semibold">Task Agent</h1>
        <ThemeToggle />
      </header>

      <ScrollArea className="flex-1 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && <LoadingBubble />}
          <div ref={scrollAnchorRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-3">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Digite uma mensagem..."
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </main>
  )
}
