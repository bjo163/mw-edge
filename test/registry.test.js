import test from 'node:test'
import assert from 'node:assert/strict'

import { fields } from '../src/orm/fields.js'
import { ModelRegistry } from '../src/orm/registry.js'
import { NotFoundError, ValidationError } from '../src/orm/errors.js'

function table(...names) {
  return Object.fromEntries(
    ['id', 'created_at', 'updated_at', ...names].map(name => [name, { name }])
  )
}

class Company {
  static _name = 'res.company'
  static _description = 'Company'
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

test('finalized registry is immutable for registrations', () => {
  const registry = new ModelRegistry().register(Company).finalize()

  assert.throws(
    () => registry.register(Partner),
    /already finalized/
  )
})
