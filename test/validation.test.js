import test from 'node:test'
import assert from 'node:assert/strict'

import { fields } from '../src/orm/fields.js'
import { ValidationError } from '../src/orm/errors.js'
import {
  normalizeId,
  prepareValues,
  validateModelDefinition,
  validateReadFields
} from '../src/orm/validation.js'

function table(...names) {
  return Object.fromEntries(
    ['id', 'created_at', 'updated_at', ...names].map(name => [name, { name }])
  )
}

test('model metadata is normalized and frozen', () => {
  class Partner {
    static _name = 'res.partner'
    static _description = 'Partner'
    static table = table('name', 'active')
    static fields = {
      name: fields.Char({ required: true }),
      active: fields.Boolean({ default: true })
    }
  }

  const meta = validateModelDefinition(Partner)

  assert.equal(meta.name, 'res.partner')
  assert.equal(meta.description, 'Partner')
  assert.equal(meta.fields.name.required, true)
  assert.equal(Object.isFrozen(meta), true)
  assert.equal(Object.isFrozen(meta.fields), true)
})

test('create applies defaults and enforces required values', () => {
  const meta = {
    fields: {
      name: fields.Char({ required: true }),
      active: fields.Boolean({ default: true })
    }
  }

  assert.deepEqual(
    prepareValues(meta, { name: 'MW Edge' }, { mode: 'create' }),
    { name: 'MW Edge', active: true }
  )

  assert.throws(
    () => prepareValues(meta, {}, { mode: 'create' }),
    ValidationError
  )
})

test('write rejects unknown, system and invalid typed fields', () => {
  const meta = {
    fields: {
      active: fields.Boolean()
    }
  }

  assert.throws(
    () => prepareValues(meta, { unknown: true }, { mode: 'write' }),
    /Unknown field/
  )

  assert.throws(
    () => prepareValues(meta, { id: 10 }, { mode: 'write' }),
    /managed by MW Edge/
  )

  assert.throws(
    () => prepareValues(meta, { active: 'yes' }, { mode: 'write' }),
    /must be a boolean/
  )
})

test('selection and many2one values are validated', () => {
  const meta = {
    fields: {
      state: fields.Selection([
        ['draft', 'Draft'],
        ['done', 'Done']
      ]),
      company_id: fields.Many2one('res.company')
    }
  }

  assert.deepEqual(
    prepareValues(meta, { state: 'draft', company_id: 1 }, { mode: 'write' }),
    { state: 'draft', company_id: 1 }
  )

  assert.throws(
    () => prepareValues(meta, { state: 'invalid' }, { mode: 'write' }),
    /Invalid value/
  )

  assert.throws(
    () => prepareValues(meta, { company_id: 0 }, { mode: 'write' }),
    /positive integer/
  )
})

test('read fields and IDs fail closed', () => {
  const meta = { fields: { name: fields.Char() } }

  assert.deepEqual(validateReadFields(meta, ['id', 'name']), ['id', 'name'])
  assert.throws(() => validateReadFields(meta, ['secret']), /Unknown field/)

  assert.equal(normalizeId('42'), 42)
  assert.throws(() => normalizeId('nope'), /positive integer/)
  assert.throws(() => normalizeId(0), /positive integer/)
})
