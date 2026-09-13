import test from 'node:test'
import assert from 'node:assert/strict'

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { compileDomain } from '../src/orm/domain.js'
import { ValidationError } from '../src/orm/errors.js'

const partner = sqliteTable('res_partner_test', {
  id: integer('id').primaryKey(),
  name: text('name'),
  company_id: integer('company_id')
})

test('domain compiler supports comparison and boolean operators', () => {
  assert.ok(compileDomain(partner, [['id', '>', 1]]))
  assert.ok(compileDomain(partner, [
    '|',
    ['name', 'ilike', 'edge'],
    ['company_id', '=', 1]
  ]))
  assert.ok(compileDomain(partner, [
    '!',
    ['company_id', '=', null]
  ]))
})

test('domain compiler supports set and null operators', () => {
  assert.ok(compileDomain(partner, [['id', 'in', [1, 2]]]))
  assert.ok(compileDomain(partner, [['id', 'not in', [3, 4]]]))
  assert.ok(compileDomain(partner, [['name', 'is null', null]]))
  assert.ok(compileDomain(partner, [['name', 'is not null', null]]))
  assert.ok(compileDomain(partner, [['id', 'in', []]]))
})

test('domain compiler rejects malformed and excessive input', () => {
  assert.throws(
    () => compileDomain(partner, [['missing', '=', 1]]),
    ValidationError
  )

  assert.throws(
    () => compileDomain(partner, ['|', ['id', '=', 1]]),
    /Invalid domain/
  )

  assert.throws(
    () => compileDomain(partner, [['id', 'in', 'nope']]),
    /expects an array/
  )

  assert.throws(
    () => compileDomain(partner, Array.from({ length: 101 }, () => ['id', '=', 1])),
    /too complex/
  )
})
