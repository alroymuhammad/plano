import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  component: () => <h1 className="p-4 text-2xl font-bold">Hello plano</h1>,
})
