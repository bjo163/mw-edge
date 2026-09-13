import { beforeEach, describe, expect, it } from 'vitest'
import { env, exports as worker } from 'cloudflare:workers'
import { createEnvironment } from '../../src/orm/index.js'
import { registry } from '../../src/models/index.js'

async function request(path, init) {
  return worker.default.fetch(new Request(`https://mw-edge.test${path}`, init))
}

async function json(response) {
  return response.json()
}

beforeEach(async () => {
  await env.MW_DB.prepare('DELETE FROM res_partner').run()
  await env.MW_DB.prepare('DELETE FROM res_company').run()
})

describe('MW Edge Worker + D1 integration', () => {
  it('boots in the Workers runtime with the D1 binding', async () => {
    const response = await request('/')

    expect(response.status).toBe(200)
    expect(await json(response)).toMatchObject({
      name: 'mw-edge',
      version: '0.1.0',
      status: 'ok',
      models: 2
    })
  })

  it('runs REST CRUD against real local D1 storage', async () => {
    const companyResponse = await request('/api/res.company', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'PT EXATEL' })
    })

    expect(companyResponse.status).toBe(201)
    const company = await json(companyResponse)

    const partnerResponse = await request('/api/res.partner', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'MW Edge Partner',
        email: 'edge@example.com',
        company_id: company.id
      })
    })

    expect(partnerResponse.status).toBe(201)
    const partner = await json(partnerResponse)
    expect(partner.company_id).toBe(company.id)

    const listResponse = await request(
      '/api/res.partner?fields=id,name,email,company_id&limit=10&offset=0'
    )
    const list = await json(listResponse)

    expect(listResponse.status).toBe(200)
    expect(list.data).toHaveLength(1)
    expect(list.data[0]).toMatchObject({
      id: partner.id,
      name: 'MW Edge Partner',
      company_id: company.id
    })
    expect(list.meta).toMatchObject({
      total: 1,
      returned: 1,
      has_more: false
    })

    const patchResponse = await request(`/api/res.partner/${partner.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: false })
    })

    expect(patchResponse.status).toBe(200)
    expect((await json(patchResponse)).active).toBe(false)

    const deleteResponse = await request(`/api/res.partner/${partner.id}`, {
      method: 'DELETE'
    })

    expect(deleteResponse.status).toBe(200)

    const missingResponse = await request(`/api/res.partner/${partner.id}`)
    expect(missingResponse.status).toBe(404)
  })

  it('runs RPC CRUD against D1', async () => {
    const createResponse = await request('/api/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'res.company',
        method: 'create',
        values: { name: 'RPC Company' }
      })
    })

    expect(createResponse.status).toBe(201)
    const company = await json(createResponse)

    const searchResponse = await request('/api/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'res.company',
        method: 'search_read',
        domain: [['id', '=', company.id]],
        fields: ['id', 'name']
      })
    })

    expect(searchResponse.status).toBe(200)
    expect(await json(searchResponse)).toEqual([
      { id: company.id, name: 'RPC Company' }
    ])
  })

  it('supports deterministic Odoo-style ordering', async () => {
    for (const name of ['Alpha', 'Zulu']) {
      const response = await request('/api/res.company', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name })
      })
      expect(response.status).toBe(201)
    }

    const response = await request(
      '/api/res.company?fields=id,name&order=name%20desc'
    )
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.data.map(record => record.name)).toEqual(['Zulu', 'Alpha'])
  })

  it('rejects malformed and oversized JSON before ORM execution', async () => {
    const malformed = await request('/api/res.company', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{'
    })

    expect(malformed.status).toBe(400)
    expect((await json(malformed)).error.code).toBe('VALIDATION_ERROR')

    const oversized = await request('/api/res.company', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x'.repeat(70 * 1024) })
    })

    expect(oversized.status).toBe(413)
    expect((await json(oversized)).error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('fails closed when Many2one points to a missing record', async () => {
    const response = await request('/api/res.partner', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Broken relation',
        company_id: 999999
      })
    })

    expect(response.status).toBe(400)
    const body = await json(response)

    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toMatchObject({
      field: 'company_id',
      comodel: 'res.company',
      id: 999999
    })

    const count = await env.MW_DB.prepare(
      'SELECT COUNT(*) AS count FROM res_partner'
    ).first()

    expect(count.count).toBe(0)
  })

  it('enforces D1 foreign keys at the storage layer', async () => {
    await expect(
      env.MW_DB.prepare(
        'INSERT INTO res_partner (name, active, company_id) VALUES (?, ?, ?)'
      ).bind('Raw invalid FK', 1, 999999).run()
    ).rejects.toThrow()

    const count = await env.MW_DB.prepare(
      'SELECT COUNT(*) AS count FROM res_partner'
    ).first()

    expect(count.count).toBe(0)
  })

  it('rolls back every statement when an atomic batch fails', async () => {
    const mw = createEnvironment(env.MW_DB, registry)

    await expect(
      mw.atomic([
        mw.statement(
          'INSERT INTO res_company (name, active) VALUES (?, ?)',
          'Atomic Company',
          1
        ),
        mw.statement(
          'INSERT INTO res_company (name, active) VALUES (?, ?)',
          null,
          1
        )
      ])
    ).rejects.toThrow()

    const count = await env.MW_DB.prepare(
      'SELECT COUNT(*) AS count FROM res_company'
    ).first()

    expect(count.count).toBe(0)
  })
})
