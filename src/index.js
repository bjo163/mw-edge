import { Hono } from 'hono'
import { createEnvironment } from './orm/index.js'
import { registry } from './models/index.js'
import { createApi } from './routes/api.js'

const app = new Hono()

app.use('*', async (c, next) => {
  c.set('mw', createEnvironment(c.env.MW_DB, registry))
  await next()
})

app.get('/', c => c.json({
  name: 'mw-edge',
  version: '0.1.0',
  status: 'ok'
}))

app.route('/api', createApi())

app.onError((error, c) => c.json({ error: error.message }, 500))

export default app
