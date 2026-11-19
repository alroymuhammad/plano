import { createDb, schema } from '@plano/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

// Secret and base URL come from BETTER_AUTH_SECRET and BETTER_AUTH_URL.
export const auth = betterAuth({
  basePath: '/auth',
  trustedOrigins: [process.env.PLATFORM_URL!],
  database: drizzleAdapter(createDb(process.env.DATABASE_URL!), { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
})
