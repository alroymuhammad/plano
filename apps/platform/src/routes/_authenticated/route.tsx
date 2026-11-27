import { Button } from '@plano/ui/components/button'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
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
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { session } = Route.useRouteContext()
  const navigate = useNavigate()

  async function handleSignOut() {
    await authClient.signOut()
    navigate({ to: '/signin' })
  }

  return (
    <>
      <nav className="flex items-center gap-4 border-b p-4">
        <Link to="/" className="font-medium">
          Home
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm">{session.user.name}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </nav>
      <Outlet />
    </>
  )
}
