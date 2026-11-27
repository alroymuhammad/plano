import { Input } from '@plano/ui/components/input'
import { Separator } from '@plano/ui/components/separator'
import { Textarea } from '@plano/ui/components/textarea'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/editor')({
  component: Editor,
})

function countWords(text: string): number {
  const trimmed = text.trim()

  if (!trimmed) {
    return 0
  }

  return trimmed.split(/\s+/).length
}

function Editor() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const words = countWords(content)

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1B3B5C]">Editor</p>

        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Untitled spatial planning analysis…"
          aria-label="Analysis title"
          className="mt-2 h-auto border-0 bg-transparent px-0 py-1 text-2xl font-semibold tracking-tight text-[#0F1E2E] shadow-none placeholder:text-[#8A9BAE] focus-visible:ring-0"
        />

        <Separator className="my-5 bg-[#E6EDF4]" />

        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Start writing your case overview, applicable RTRW/RDTR regulations, and compliance findings…"
          aria-label="Analysis notes"
          className="min-h-[360px] flex-1 resize-none border-0 bg-transparent px-0 py-0 text-sm leading-relaxed text-[#0F1E2E] shadow-none placeholder:text-[#8A9BAE] focus-visible:ring-0"
        />
      </div>

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-[#E6EDF4] px-6 text-xs text-[#5E7287]">
        <span>Editor draft workspace</span>
        <span>{words === 1 ? '1 word' : `${words} words`}</span>
      </footer>
    </div>
  )
}
