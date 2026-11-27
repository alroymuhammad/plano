import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context }) => {
    const session = await context.auth.getSession()

    if (session) {
      throw redirect({ to: '/' })
    }
  },
  component: () => <Outlet />,
})
