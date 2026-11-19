import { createAuthClient } from 'better-auth/react'

// Defaults to `/api/auth`, proxied to the API.
export const authClient = createAuthClient()
