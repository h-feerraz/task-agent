'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

import { Switch } from '@/components/ui/switch'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="size-5 w-9" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <div className="flex items-center gap-2">
      <Sun className="size-4" />
      <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} aria-label="Alternar tema" />
      <Moon className="size-4" />
    </div>
  )
}
