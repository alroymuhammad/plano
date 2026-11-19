import { Button } from '@plano/ui/components/button'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { authClient } from '../modules/auth/client'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  const { data: session } = authClient.useSession()

  return (
    <>
      <nav className="flex items-center gap-4 p-4 border-b">
        <Link to="/">Home</Link>
        <div className="ml-auto flex items-center gap-4">
          {session ? (
            <>
              <span className="text-sm">{session.user.name}</span>
              <Button variant="outline" size="sm" onClick={() => authClient.signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/signin">Sign in</Link>
              <Link to="/signup">Sign up</Link>
            </>
          )}
        </div>
      </nav>
      <Outlet />
    </>
  )
}
