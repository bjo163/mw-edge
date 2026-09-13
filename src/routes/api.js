import { Hono } from 'hono'
import { NotFoundError, ValidationError } from '../orm/index.js'
import { readJsonObject } from './body.js'
import { paginationMeta, parseCollectionQuery } from './query.js'

function missingRecord(model, id) {
  throw new NotFoundError(`Record not found: ${model}(${id})`, { model, id })
}

export function createApi() {
  const api = new Hono()

  api.get('/models', c => c.json({
    models: c.get('mw').registry.describeAll()
  }))

  api.get('/models/:model', c => c.json(
    c.get('mw').registry.describe(c.req.param('model'))
  ))

  api.post('/rpc', async c => {
    const {
      model,
      method,
      domain = [],
      fields = [],
      values,
      id,
      limit,
      offset,
      order
    } = await readJsonObject(c)

    if (typeof model !== 'string' || typeof method !== 'string') {
      throw new ValidationError('RPC model and method are required')
    }

    const target = c.get('mw').model(model)

    switch (method) {
      case 'search': {
        const records = await target.search(domain, { limit, offset, order })
        return c.json(records.toJSON())
      }
      case 'search_read':
        return c.json(await target.searchRead(domain, fields, { limit, offset, order }))
      case 'count':
        return c.json({ count: await target.count(domain) })
      case 'browse': {
        const record = await target.browse(id)
        if (!record) missingRecord(model, id)
        return c.json(record.toJSON())
      }
      case 'create': {
        const record = await target.create(values ?? {})
        return c.json(record.toJSON(), 201)
      }
      case 'create_many': {
        const records = await target.createMany(values ?? [])
        return c.json(records.toJSON(), 201)
      }
      case 'write': {
        const record = await target.browse(id)
        if (!record) missingRecord(model, id)
        await record.write(values ?? {})
        return c.json(record.toJSON())
      }
      case 'unlink': {
        const record = await target.browse(id)
        if (!record) missingRecord(model, id)
        await record.unlink()
        return c.json({ ok: true })
      }
      default:
        throw new ValidationError(`Unsupported RPC method: ${method}`, { method })
    }
  })

  api.get('/:model', async c => {
    const target = c.get('mw').model(c.req.param('model'))
    const query = parseCollectionQuery(c.req.query())
    const data = await target.searchRead(query.domain, query.fields, {
      limit: query.limit,
      offset: query.offset,
      order: query.order
    })
    const total = await target.count(query.domain)

    return c.json({
      data,
      meta: paginationMeta({
        total,
        limit: query.limit,
        offset: query.offset,
        returned: data.length
      })
    })
  })

  api.get('/:model/:id', async c => {
    const modelName = c.req.param('model')
    const id = c.req.param('id')
    const model = c.get('mw').model(modelName)
    const record = await model.browse(id)
    if (!record) missingRecord(modelName, id)
    return c.json(record.toJSON())
  })

  api.post('/:model', async c => {
    const model = c.get('mw').model(c.req.param('model'))
    const record = await model.create(await readJsonObject(c))
    return c.json(record.toJSON(), 201)
  })

  api.patch('/:model/:id', async c => {
    const modelName = c.req.param('model')
    const id = c.req.param('id')
    const model = c.get('mw').model(modelName)
    const record = await model.browse(id)
    if (!record) missingRecord(modelName, id)
    await record.write(await readJsonObject(c))
    return c.json(record.toJSON())
  })

  api.delete('/:model/:id', async c => {
    const modelName = c.req.param('model')
    const id = c.req.param('id')
    const model = c.get('mw').model(modelName)
    const record = await model.browse(id)
    if (!record) missingRecord(modelName, id)
    await record.unlink()
    return c.json({ ok: true })
  })

  return api
}
