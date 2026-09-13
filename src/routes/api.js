import { Hono } from 'hono'

export function createApi() {
  const api = new Hono()

  api.get('/models', c => c.json({ models: c.get('mw').registry.names() }))

  api.post('/rpc', async c => {
    const { model, method, domain = [], fields = [], values, id, limit, offset } = await c.req.json()
    const target = c.get('mw').model(model)

    switch (method) {
      case 'search': {
        const records = await target.search(domain, { limit, offset })
        return c.json(records.map(record => record.toJSON()))
      }
      case 'search_read':
        return c.json(await target.searchRead(domain, fields, { limit, offset }))
      case 'count':
        return c.json({ count: await target.count(domain) })
      case 'browse': {
        const record = await target.browse(id)
        return record ? c.json(record.toJSON()) : c.json({ error: 'Not found' }, 404)
      }
      case 'create': {
        const record = await target.create(values ?? {})
        return c.json(record.toJSON(), 201)
      }
      case 'write': {
        const record = await target.browse(id)
        if (!record) return c.json({ error: 'Not found' }, 404)
        await record.write(values ?? {})
        return c.json(record.toJSON())
      }
      case 'unlink': {
        const record = await target.browse(id)
        if (!record) return c.json({ error: 'Not found' }, 404)
        await record.unlink()
        return c.json({ ok: true })
      }
      default:
        return c.json({ error: `Unsupported method: ${method}` }, 400)
    }
  })

  api.get('/:model', async c => {
    const model = c.get('mw').model(c.req.param('model'))
    return c.json(await model.searchRead([], []))
  })

  api.get('/:model/:id', async c => {
    const model = c.get('mw').model(c.req.param('model'))
    const record = await model.browse(c.req.param('id'))
    return record ? c.json(record.toJSON()) : c.json({ error: 'Not found' }, 404)
  })

  api.post('/:model', async c => {
    const model = c.get('mw').model(c.req.param('model'))
    const record = await model.create(await c.req.json())
    return c.json(record.toJSON(), 201)
  })

  api.patch('/:model/:id', async c => {
    const model = c.get('mw').model(c.req.param('model'))
    const record = await model.browse(c.req.param('id'))
    if (!record) return c.json({ error: 'Not found' }, 404)
    await record.write(await c.req.json())
    return c.json(record.toJSON())
  })

  api.delete('/:model/:id', async c => {
    const model = c.get('mw').model(c.req.param('model'))
    const record = await model.browse(c.req.param('id'))
    if (!record) return c.json({ error: 'Not found' }, 404)
    await record.unlink()
    return c.json({ ok: true })
  })

  return api
}
