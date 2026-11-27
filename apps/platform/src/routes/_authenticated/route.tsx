import { Avatar, AvatarFallback } from '@plano/ui/components/avatar'
import { Badge } from '@plano/ui/components/badge'
import { Bubble, BubbleContent } from '@plano/ui/components/bubble'
import { Button } from '@plano/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@plano/ui/components/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@plano/ui/components/input-group'
import { Message, MessageContent, MessageHeader } from '@plano/ui/components/message'
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@plano/ui/components/message-scroller'
import { ScrollArea } from '@plano/ui/components/scroll-area'
import { Separator } from '@plano/ui/components/separator'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../../modules/auth/client'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.auth.getSession()

    if (!session) {
      throw redirect({
        to: '/signin',
        search: { redirect: location.href },
      })
    }

    return { session }
  },
  loader: ({ context }) => ({
    user: {
      email: context.session.user.email,
      name: context.session.user.name,
    },
  }),
  component: AuthenticatedLayout,
})

function ChevronsLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M11 5.5 6.5 10 11 14.5M15 5.5 10.5 10 15 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronsRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 5.5 13.5 10 9 14.5M5 5.5 9.5 10 5 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 7v6M7 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M5.5 3.5h6l3 3v10a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 3.5v3h3M7.5 10h5M7.5 13h3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 4.5v11M8 4.5v11M11.5 4.5l3 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 5.5h11a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 2.5v-2.5h-1A1.5 1.5 0 0 1 3 13V7a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 15V5m0 0-4 4m4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function getEmailInitial(email: string): string {
  const trimmed = email.trim()

  if (!trimmed) {
    return 'A'
  }

  return trimmed[0].toUpperCase()
}

function AuthenticatedLayout() {
  const { user } = Route.useLoaderData()
  const navigate = useNavigate()
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  async function handleSignOut() {
    await authClient.signOut()
    navigate({ to: '/signin' })
  }

  const emailInitial = getEmailInitial(user.email)

  return (
    <div className="flex h-dvh w-screen flex-row overflow-hidden bg-[#EFF4F8] text-[#0F1E2E]">
      <aside
        aria-label="Workspace navigation"
        className={`flex h-full shrink-0 flex-col overflow-hidden bg-[#EFF4F8] transition-[width] duration-200 ease-out ${
          leftOpen ? 'w-64 border-r border-[#D6E0EA]' : 'w-0 border-r-0'
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#D6E0EA] px-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 min-w-0 flex-1 justify-start gap-2 px-1.5 text-left text-[#0F1E2E] hover:bg-[#E2EBF3]"
                >
                  <Avatar size="sm" className="shrink-0">
                    <AvatarFallback className="bg-[#1B3B5C] text-[11px] font-semibold text-white">
                      {emailInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium text-[#0F1E2E]">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 border-[#D6E0EA] bg-white">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate text-xs font-semibold text-[#0F1E2E]">
                      {user.email}
                    </span>
                    {user.name && (
                      <span className="truncate text-xs text-[#5E7287]">{user.name}</span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#E6EDF4]" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-[#1E3145] focus:bg-[#EFF4F8] focus:text-[#0F1E2E]"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setLeftOpen(false)}
              aria-label="Collapse left sidebar"
              className="shrink-0 text-[#5E7287] hover:bg-[#E2EBF3] hover:text-[#0F1E2E]"
            >
              <ChevronsLeftIcon className="size-4" />
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-3 py-3">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="mb-1 h-9 justify-start gap-2.5 px-2.5 text-sm font-medium text-[#1B3B5C] hover:bg-[#E2EBF3] hover:text-[#142D47]"
              >
                <PlusCircleIcon className="size-4" />
                New Analysis
              </Button>

              <nav className="flex flex-col gap-1">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 justify-start gap-2.5 border-[#CFDBE7] bg-white px-2.5 text-sm font-medium text-[#0F1E2E] shadow-2xs hover:bg-white hover:text-[#0F1E2E]"
                >
                  <Link to="/editor">
                    <DocumentIcon className="size-4 text-[#1B3B5C]" />
                    <span className="truncate">Editor</span>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 justify-start gap-2.5 px-2.5 text-sm font-medium text-[#465A70] hover:bg-[#E2EBF3] hover:text-[#0F1E2E]"
                >
                  <LibraryIcon className="size-4 text-[#5E7287]" />
                  <span className="truncate">Library</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 justify-start gap-2.5 px-2.5 text-sm font-medium text-[#465A70] hover:bg-[#E2EBF3] hover:text-[#0F1E2E]"
                >
                  <SearchIcon className="size-4 text-[#5E7287]" />
                  <span className="truncate">Find Documents</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRightOpen((prev) => !prev)}
                  className={`h-9 justify-between px-2.5 text-sm font-medium ${
                    rightOpen
                      ? 'bg-[#E6F0FA] text-[#1B3B5C] hover:bg-[#DCE9F7] hover:text-[#142D47]'
                      : 'text-[#465A70] hover:bg-[#E2EBF3] hover:text-[#0F1E2E]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <ChatIcon className="size-4" />
                    <span className="truncate">AI Chat</span>
                  </span>
                  <span className="text-[11px] font-medium text-[#5E7287]">
                    {rightOpen ? 'Open' : 'Hidden'}
                  </span>
                </Button>
              </nav>
            </div>
          </ScrollArea>

          <div className="shrink-0 px-3 pb-3 pt-2">
            <Separator className="mb-3 bg-[#D6E0EA]" />
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="truncate text-xs text-[#5E7287]">Plano Workspace</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleSignOut}
                className="text-xs text-[#465A70] hover:bg-[#E2EBF3] hover:text-[#0F1E2E]"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#E6EDF4] px-4">
          <div className="flex min-w-0 items-center gap-2">
            {!leftOpen && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setLeftOpen(true)}
                aria-label="Expand left sidebar"
                className="shrink-0 text-[#5E7287] hover:bg-[#EFF4F8] hover:text-[#0F1E2E]"
              >
                <ChevronsRightIcon className="size-4" />
              </Button>
            )}
            <span className="truncate text-sm font-medium text-[#0F1E2E]">
              Untitled Analysis Session
            </span>
            <Badge
              variant="secondary"
              className="rounded bg-[#E6F0FA] px-2 py-0.5 text-[11px] font-medium text-[#1B3B5C]"
            >
              Draft
            </Badge>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!rightOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRightOpen(true)}
                aria-label="Open AI Chat panel"
                className="h-8 gap-1.5 border-[#CBD6E2] bg-white px-2.5 text-xs font-medium text-[#1B3B5C] shadow-none hover:bg-[#EFF4F8] hover:text-[#142D47]"
              >
                <ChatIcon className="size-3.5" />
                <span>AI Chat</span>
              </Button>
            )}
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <Outlet />
        </ScrollArea>
      </main>

      <aside
        aria-label="AI Chat assistant"
        className={`flex h-full shrink-0 flex-col overflow-hidden bg-white transition-[width] duration-200 ease-out ${
          rightOpen ? 'w-80 border-l border-[#D6E0EA]' : 'w-0 border-l-0'
        }`}
      >
        <div className="flex h-full w-80 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#E6EDF4] px-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setRightOpen(false)}
                aria-label="Collapse AI Chat panel"
                className="text-[#5E7287] hover:bg-[#EFF4F8] hover:text-[#0F1E2E]"
              >
                <ChevronsRightIcon className="size-4" />
              </Button>
              <span className="text-sm font-semibold text-[#0F1E2E]">AI Chat</span>
            </div>

            <Badge
              variant="outline"
              className="rounded-md border-[#C6D5E3] bg-[#EFF4F8] px-2 py-0.5 text-[11px] font-medium text-[#1B3B5C]"
            >
              Assistant
            </Badge>
          </div>

          <MessageScrollerProvider>
            <MessageScroller className="min-h-0 flex-1 bg-[#F8FAFC]">
              <MessageScrollerViewport className="p-4">
                <MessageScrollerContent className="gap-4">
                  <MessageScrollerItem>
                    <Message align="start">
                      <MessageContent>
                        <MessageHeader className="px-0 text-[11px] font-semibold uppercase tracking-wider text-[#1B3B5C]">
                          Research Assistant
                        </MessageHeader>
                        <Bubble variant="outline" className="max-w-full">
                          <BubbleContent className="border-[#D6E0EA] bg-white text-[#465A70] shadow-2xs">
                            Ask questions about Library regulations, verify zoning clauses, or draft
                            sections for your analysis notes.
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>

                  <MessageScrollerItem>
                    <div className="flex flex-col gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="h-auto justify-start border-dashed border-[#CBD6E2] bg-white/80 px-3 py-2 text-left text-xs font-normal whitespace-normal text-[#54677B] shadow-none"
                      >
                        Summarize applicable RTRW provisions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="h-auto justify-start border-dashed border-[#CBD6E2] bg-white/80 px-3 py-2 text-left text-xs font-normal whitespace-normal text-[#54677B] shadow-none"
                      >
                        Check zoning compliance for current case
                      </Button>
                    </div>
                  </MessageScrollerItem>
                </MessageScrollerContent>
              </MessageScrollerViewport>
            </MessageScroller>
          </MessageScrollerProvider>

          <div className="shrink-0 border-t border-[#E6EDF4] bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="rounded border border-[#D6E0EA] bg-[#EFF4F8] px-2 py-0.5 text-[11px] font-medium text-[#1E3145]"
              >
                Library
              </Badge>
              <Badge
                variant="secondary"
                className="rounded border border-[#D6E0EA] bg-[#EFF4F8] px-2 py-0.5 text-[11px] font-medium text-[#1E3145]"
              >
                Current analysis
              </Badge>
            </div>

            <InputGroup className="border-[#CBD6E2] bg-white shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-[#1B3B5C] has-[[data-slot=input-group-control]:focus-visible]:ring-[#1B3B5C]/15">
              <InputGroupTextarea
                rows={2}
                disabled
                placeholder="Ask AI about regulations or your notes…"
                className="min-h-14 px-3 py-2.5 text-sm text-[#0F1E2E] placeholder:text-[#8A9BAE]"
              />
              <InputGroupAddon align="block-end" className="justify-end px-2.5 pb-2 pt-0">
                <InputGroupButton
                  variant="default"
                  size="icon-sm"
                  disabled
                  aria-label="Send message"
                  className="bg-[#1B3B5C] text-white hover:bg-[#142D47]"
                >
                  <ArrowUpIcon className="size-4" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </aside>
    </div>
  )
}
