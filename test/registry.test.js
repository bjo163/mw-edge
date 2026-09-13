import test from 'node:test'
import assert from 'node:assert/strict'

import { fields } from '../src/orm/fields.js'
import { ModelRegistry } from '../src/orm/registry.js'
import { AccessError, NotFoundError, ValidationError } from '../src/orm/errors.js'

function table(...names) {
  return Object.fromEntries(
    ['id', 'created_at', 'updated_at', ...names].map(name => [name, { name }])
  )
}

class Company {
  static _name = 'res.company'
  static _description = 'Company'
  static _api = {
    rest: true,
    rpc: ['search_read', 'create']
  }
  static table = table('name')
  static fields = {
    name: fields.Char({ required: true })
  }
}

class Partner {
  static _name = 'res.partner'
  static _description = 'Partner'
  static table = table('name', 'company_id')
  static fields = {
    name: fields.Char({ required: true }),
    company_id: fields.Many2one('res.company')
  }
}

test('registry registers, introspects and finalizes related models', () => {
  const registry = new ModelRegistry()
    .register(Company)
    .register(Partner)
    .finalize()

  assert.deepEqual(registry.names(), ['res.company', 'res.partner'])
  assert.equal(registry.get('res.partner'), Partner)
  assert.equal(registry.describe('res.partner').fields.company_id.comodel, 'res.company')
  assert.equal(registry.describeAll().length, 2)
  assert.deepEqual(registry.describeApi().map(model => model.name), ['res.company'])
})

test('API exposure is explicit and fail closed', () => {
  const registry = new ModelRegistry()
    .register(Company)
    .register(Partner)
    .finalize()

  assert.doesNotThrow(() => registry.assertRest('res.company'))
  assert.doesNotThrow(() => registry.assertRpc('res.company', 'search_read'))
  assert.throws(() => registry.assertRest('res.partner'), AccessError)
  assert.throws(() => registry.assertRpc('res.company', 'unlink'), AccessError)
})

test('registry rejects duplicate and unknown models', () => {
  const registry = new ModelRegistry().register(Company)

  assert.throws(() => registry.register(Company), ValidationError)
  assert.throws(() => registry.get('unknown.model'), NotFoundError)
})

test('registry fails closed when a Many2one comodel is missing', () => {
  const registry = new ModelRegistry().register(Partner)

  assert.throws(
    () => registry.finalize(),
    /Unknown comodel res.company/
  )
})

test('registry rejects reserved model names', () => {
  class Reserved {
    static _name = 'mw.model'
    static table = table('name')
    static fields = {
      name: fields.Char()
    }
  }

  assert.throws(
    () => new ModelRegistry().register(Reserved),
    /reserved by MW Edge/
  )
})

test('finalized registry is immutable for registrations', () => {
  const registry = new ModelRegistry().register(Company).finalize()

  assert.throws(
    () => registry.register(Partner),
    /already finalized/
  )
})
