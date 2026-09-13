import test from 'node:test'
import assert from 'node:assert/strict'

import { Record, RecordSet } from '../src/orm/model.js'
import { ValidationError } from '../src/orm/errors.js'

function model() {
  return {
    meta: { fields: {} },
    exists: async id => id === 1
  }
}

test('recordset exposes stable collection helpers', () => {
  const source = model()
  const records = new RecordSet(source, [
    new Record(source, { id: 1, name: 'A' }),
    new Record(source, { id: 2, name: 'B' })
  ])

  assert.equal(records.length, 2)
  assert.deepEqual(records.ids, [1, 2])
  assert.equal(records.first().name, 'A')
  assert.deepEqual(records.mapped('name'), ['A', 'B'])
  assert.deepEqual(records.filtered(record => record.id === 2).ids, [2])
  assert.deepEqual([...records].map(record => record.id), [1, 2])
  assert.deepEqual(records.toJSON(), [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' }
  ])
})

test('ensureOne fails closed for zero or multiple records', () => {
  const source = model()

  assert.throws(
    () => new RecordSet(source).ensureOne(),
    ValidationError
  )

  assert.throws(
    () => new RecordSet(source, [
      new Record(source, { id: 1 }),
      new Record(source, { id: 2 })
    ]).ensureOne(),
    ValidationError
  )

  assert.equal(
    new RecordSet(source, [new Record(source, { id: 1 })]).ensureOne().id,
    1
  )
})
