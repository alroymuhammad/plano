import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

export type AuthSession = typeof authClient.$Infer.Session

export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const result = await authClient.getSession()
    return result.data ?? null
  } catch {
    return null
  }
}
