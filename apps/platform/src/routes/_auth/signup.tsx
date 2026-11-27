import { Alert, AlertDescription } from '@plano/ui/components/alert'
import { Button } from '@plano/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@plano/ui/components/field'
import { Input } from '@plano/ui/components/input'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../../modules/auth/client'
import { AuthLayout, PasswordInput } from '../../modules/auth/components/auth-layout'

export const Route = createFileRoute('/_auth/signup')({
  component: SignUp,
})

function SignUp() {
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(undefined)
    setPending(true)
    const { error: authError } = await authClient.signUp.email({
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    })
    setPending(false)

    if (authError) {
      setError(authError.message)
      return
    }

    navigate({ to: '/editor' })
  }

  return (
    <AuthLayout
      mode="signup"
      badge="New analyst registration"
      title="Create an account"
      description="Enter your details to open your planning research workspace."
    >
      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-4">
          <Field className="gap-1.5">
            <FieldLabel htmlFor="name" className="text-[#1E3145]">
              Full name
            </FieldLabel>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Nadia Kusuma"
              required
              className="h-10 border-[#CBD6E2] bg-white px-3.5 text-sm text-[#0F1E2E] shadow-none placeholder:text-[#8A9BAE] focus-visible:border-[#1B3B5C] focus-visible:ring-[#1B3B5C]/15"
            />
          </Field>

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
              autoComplete="new-password"
              placeholder="Enter your password"
              minLength={8}
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
            {pending ? 'Creating account…' : 'Create account'}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
