import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { AuthSession } from '../modules/auth/client'

export type RouterContext = {
  auth: {
    getSession: () => Promise<AuthSession | null>
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})
