import { serve } from '@hono/node-server'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { auth } from './auth'

const app = new Hono()

app.get('/', (c) => c.text('ok'))

app.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw))

app.post('/hello', zValidator('json', z.object({ name: z.string().min(1) })), (c) =>
  c.json({ message: `Hello, ${c.req.valid('json').name}!` }),
)

serve({ fetch: app.fetch, port: 3000 }, ({ port }) => {
  console.log(`api listening on http://localhost:${port}`)
})

export type AppType = typeof app
