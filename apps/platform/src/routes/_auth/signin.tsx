import { Alert, AlertDescription } from '@plano/ui/components/alert'
import { Button } from '@plano/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@plano/ui/components/field'
import { Input } from '@plano/ui/components/input'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../../modules/auth/client'
import { AuthLayout, PasswordInput } from '../../modules/auth/components/auth-layout'

function safeRedirectTarget(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return undefined
  }

  return value
}

export const Route = createFileRoute('/_auth/signin')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const target = safeRedirectTarget(search.redirect)

    if (!target) {
      return {}
    }

    return { redirect: target }
  },
  component: SignIn,
})

function SignIn() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(undefined)
    setPending(true)
    const { error: authError } = await authClient.signIn.email({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    })
    setPending(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (redirectTo) {
      navigate({ href: redirectTo })
      return
    }

    navigate({ to: '/' })
  }

  return (
    <AuthLayout
      mode="signin"
      badge="Analyst access"
      title="Sign in to Plano"
      description="Enter your email and password to access your cases."
    >
      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-4">
          <Field className="gap-1.5">
            <FieldLabel htmlFor="email" className="text-[#1E3145]">
              Email address
            </FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="analyst@institution.ac.id"
              required
              className="h-10 border-[#CBD6E2] bg-white px-3.5 text-sm text-[#0F1E2E] shadow-none placeholder:text-[#8A9BAE] focus-visible:border-[#1B3B5C] focus-visible:ring-[#1B3B5C]/15"
            />
          </Field>

          <Field className="gap-1.5">
            <FieldLabel htmlFor="password" className="text-[#1E3145]">
              Password
            </FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </Field>

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 py-2.5 text-red-700">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="mt-1 h-10 w-full bg-[#1B3B5C] text-white hover:bg-[#142D47]"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
