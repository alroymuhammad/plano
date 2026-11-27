import { Badge } from '@plano/ui/components/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@plano/ui/components/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@plano/ui/components/input-group'
import { Separator } from '@plano/ui/components/separator'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

export type AuthLayoutProps = {
  mode: 'signin' | 'signup'
  title: string
  description: string
  badge: string
  children: React.ReactNode
}

export function PlanoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="currentColor" fillOpacity="0.12" />
      <rect
        x="2.75"
        y="2.75"
        width="22.5"
        height="22.5"
        rx="5.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9 7v14M9 13h10M15 7v14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="13" r="2.25" fill="currentColor" />
    </svg>
  )
}

export function PasswordInput({
  id,
  name,
  autoComplete,
  placeholder,
  minLength,
  required,
}: {
  id: string
  name: string
  autoComplete: string
  placeholder: string
  minLength?: number
  required?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup className="h-10 border-[#CBD6E2] bg-white shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-[#1B3B5C] has-[[data-slot=input-group-control]:focus-visible]:ring-[#1B3B5C]/15">
      <InputGroupInput
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        className="text-sm text-[#0F1E2E] placeholder:text-[#8A9BAE]"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="text-[#687C91] hover:bg-transparent hover:text-[#0F1E2E]"
        >
          {visible ? (
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M3 3l14 14M8.5 5.2A7.7 7.7 0 0 1 10 5c4.7 0 7.5 5 7.5 5a13.4 13.4 0 0 1-2.4 3M11.6 14.8A7.7 7.7 0 0 1 10 15c-4.7 0-7.5-5-7.5-5a13.6 13.6 0 0 1 2.9-3.4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

export function AuthLayout({ mode, title, description, badge, children }: AuthLayoutProps) {
  const isSignUp = mode === 'signup'

  return (
    <div className="grid h-dvh w-screen overflow-hidden bg-white text-[#0F1E2E] lg:grid-cols-[1.08fr_1fr]">
      <aside className="relative hidden h-full flex-col justify-between overflow-hidden border-r border-[#D6E0EA] bg-[#EFF4F8] p-8 xl:p-12 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            backgroundImage:
              'linear-gradient(to right, #CBD8E6 1px, transparent 1px), linear-gradient(to bottom, #CBD8E6 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5 text-[#1B3B5C]">
            <PlanoMark className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight text-[#0F1E2E]">Plano</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <Badge
            variant="outline"
            className="gap-2 rounded-md border-[#C6D5E3] bg-white/85 px-2.5 py-1 text-xs font-medium text-[#1B3B5C] backdrop-blur-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#1B3B5C]" />
            Regulatory &amp; Spatial Verification
          </Badge>

          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-[#0F1E2E]">
            Verify spatial planning rules down to the exact clause and page.
          </h2>

          <p className="text-sm leading-relaxed text-[#465A70]">
            Built for planology researchers and civic verifiers checking zoning status, active
            ordinances, and regional plan compliance without guesswork.
          </p>

          <Card className="gap-3 border-[#CFDBE7] bg-white/90 py-5 shadow-xs backdrop-blur-xs">
            <CardHeader className="px-5">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[#1B3B5C]">
                Active Instrument
              </CardDescription>
              <CardTitle className="text-sm font-medium text-[#0F1E2E]">
                Perda RTRW &amp; RDTR Provision Index
              </CardTitle>
              <CardAction>
                <Badge
                  variant="secondary"
                  className="rounded bg-[#E6F0FA] px-2 py-0.5 text-[11px] font-medium text-[#1B3B5C]"
                >
                  Verified
                </Badge>
              </CardAction>
            </CardHeader>
            <div className="px-5">
              <Separator className="bg-[#E6EDF4]" />
            </div>
            <CardContent className="px-5">
              <ul className="space-y-2 text-xs text-[#465A70]">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2E6F9E]" />
                  Direct page citations linked to official PDF ordinances
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2E6F9E]" />
                  Tracks active, superseded, and revoked planning documents
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2E6F9E]" />
                  Structured workspace for case &amp; permit analysis
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <p className="relative z-10 text-xs text-[#5E7287]">
          Plano Research Workspace · Urban &amp; Regional Planning
        </p>
      </aside>

      <main className="flex h-full flex-col justify-between overflow-y-auto px-6 py-6 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="inline-flex items-center gap-2 text-[#1B3B5C] lg:hidden">
            <PlanoMark className="h-6 w-6" />
            <span className="text-base font-semibold text-[#0F1E2E]">Plano</span>
          </Link>
          <span className="text-xs font-medium text-[#5E7287]">{badge}</span>
        </div>

        <div className="mx-auto my-auto w-full max-w-[380px] py-4">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-[#0F1E2E]">{title}</h1>
            <p className="mt-1.5 text-sm text-[#54677B]">{description}</p>
          </div>

          {children}

          <p className="mt-5 text-sm text-[#54677B]">
            {isSignUp ? 'Already have an account? ' : 'Need an account? '}
            <Link
              to={isSignUp ? '/signin' : '/signup'}
              className="font-medium text-[#1B3B5C] underline underline-offset-4 hover:text-[#142D47]"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>

        <div aria-hidden="true" className="h-4" />
      </main>
    </div>
  )
}
