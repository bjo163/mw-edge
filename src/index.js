import { Hono } from 'hono'
import { createEnvironment } from './orm/index.js'
import { errorPayload } from './orm/errors.js'
import { registry } from './models/index.js'
import { createApi } from './routes/api.js'

const app = new Hono()

app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('x-request-id', requestId)
  await next()
})

app.use('*', async (c, next) => {
  c.set('mw', createEnvironment(c.env.MW_DB, registry))
  await next()
})

app.get('/', c => c.json({
  name: 'mw-edge',
  version: '0.1.0',
  status: 'ok',
  models: registry.names().length
}))

app.route('/api', createApi())

app.onError((error, c) => {
  const { status, body } = errorPayload(error, c.get('requestId'))

  if (status >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      request_id: c.get('requestId'),
      message: error.message,
      stack: error.stack
    }))
  }

  return c.json(body, status)
})

export default app
