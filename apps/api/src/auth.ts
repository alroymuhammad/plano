import { createDb, schema } from '@plano/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

export const auth = betterAuth({
  basePath: '/auth',
  trustedOrigins: [process.env.PLATFORM_URL!],
  database: drizzleAdapter(createDb(process.env.DATABASE_URL!), { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
})
